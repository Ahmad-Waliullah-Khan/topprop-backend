import { bind, BindingScope, Getter, service } from '@loopback/core';
import { Filter, repository, Where } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { User } from '@src/models';
import { UserRepository } from '@src/repositories';
import { EMAIL_TEMPLATES, ROLES } from '@src/utils/constants';
import { UserHelpers } from '@src/utils/helpers';
import { Credentials } from '@src/utils/interfaces';
import { USER_MESSAGES } from '@src/utils/messages';
import { compare, hash } from 'bcrypt';
import chalk from 'chalk';
import { randomBytes } from 'crypto';
import { isEqual, isNumber, merge } from 'lodash';
import moment from 'moment';
import { EmailService } from './email.service';

@bind({ scope: BindingScope.TRANSIENT })
export class UserService {
    private HASH_ROUNDS = 10;
    constructor(
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @service() private emailService: EmailService,
    ) {}

    async setPassword(password: string) {
        return await hash(password, this.HASH_ROUNDS);
    }

    async validPassword(password: string, hashPassword: string) {
        return await compare(password, hashPassword);
    }

    async verifyCredentials(credentials: Credentials, verifyAdmin = false): Promise<User> {
        let verifyUserQuery: Filter<User> = {
            where: { email: credentials.email },
        };
        if (verifyAdmin) verifyUserQuery.where = { ...verifyUserQuery.where, role: ROLES.ADMIN };
        else verifyUserQuery.where = { ...verifyUserQuery.where, role: ROLES.USER };

        const userRepository = await this.userRepositoryGetter();
        const foundUser = await userRepository.findOne(verifyUserQuery);

        const passwordMatched =
            (foundUser && (await this.validPassword(credentials.password, foundUser.hash as string))) || false;

        if (!foundUser || !passwordMatched) {
            throw new HttpErrors.BadRequest(USER_MESSAGES.INVALID_CREDENTIALS);
        }

        return foundUser;
    }

    assignDefaultPermissions(isAdmin = false): string[] {
        return UserHelpers.defaultPermissions(isAdmin);
    }
    assignDefaultRole(isAdmin = false): ROLES {
        let defaultRole = ROLES.USER;
        if (isAdmin) defaultRole = ROLES.ADMIN;
        return defaultRole;
    }

    async syncDefaultPermissions(): Promise<void> {
        const userRepository = await this.userRepositoryGetter();
        const users = await userRepository.find();
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            if (isEqual(user.role, ROLES.ADMIN)) user.permissions = UserHelpers.defaultPermissions(true);
            else user.permissions = UserHelpers.defaultPermissions();
            await userRepository.save(user);
        }
        return;
    }
    async syncDefaultRole(): Promise<void> {
        const userRepository = await this.userRepositoryGetter();
        const users = await userRepository.find();
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            if (isEqual(user.email, process.env.ADMIN_EMAIL)) user.role = ROLES.ADMIN;
            else user.role = ROLES.USER;
            await userRepository.save(user);
        }
        return;
    }

    setConfirmAccountToken(): string {
        return randomBytes(3).toString('hex');
    }

    setForgotPasswordFields(user: User) {
        user.forgotPasswordToken = randomBytes(3).toString('hex');
        user.forgotPasswordTokenExpiresIn = moment().add(30, 'minutes').toDate();
        return user;
    }

    isForgotPasswordTokenExpired(forgotPasswordTokenExpiresIn: Date): boolean {
        return moment().isAfter(moment(forgotPasswordTokenExpiresIn));
    }

    async validUsername(username: string, excludeUserId?: number): Promise<boolean> {
        const userRepository = await this.userRepositoryGetter();
        let defaultWhere: Where<User> = {
            username,
        };
        if (excludeUserId) {
            let excludeWhere: Where<User> = {
                id: { nin: [excludeUserId] },
            };
            defaultWhere = merge(defaultWhere, excludeWhere);
        }
        const usersCount = await userRepository.count(defaultWhere);
        if (usersCount.count > 0) return false;
        return true;
    }

    // buildUsername(email: string): string {
    //     let splittedEmail = email.split('@');
    //     let tentativeUsername = `@${splittedEmail[0]}`.substr(0, 5).replace('+', '-');
    //     let defaultUsername = MiscHelpers.appendRandomStr(`${tentativeUsername}-`, 20);
    //     return defaultUsername;
    // }

    async validEmail(email: string, excludeUserId?: number): Promise<boolean> {
        const userRepository = await this.userRepositoryGetter();
        let defaultWhere: Where<User> = {
            email,
        };
        if (excludeUserId) {
            let excludeWhere: Where<User> = {
                id: { nin: [excludeUserId] },
            };
            defaultWhere = merge(defaultWhere, excludeWhere);
        }
        const usersCount = await userRepository.count(defaultWhere);
        if (usersCount.count > 0) return false;
        return true;
    }

    // async sendPushNotification(user: User | number, payload: admin.messaging.MulticastMessage): Promise<string[]> {
    //     if (isNumber(user)) user = await this.userRepository.findById(user);

    //     let devices: string[] = [];
    //     try {
    //         devices = (await this.userRepository.devices(user.id).find()).map(device => device.tokenId);
    //     } catch (error) {
    //         console.error(
    //             `Error fetching devices from user: ${user.email} on: sendPushNotification. Error:${JSON.stringify(
    //                 error,
    //             )}`,
    //         );
    //     }
    //     if (!devices.length) console.error(`${user.email} does not have devices registered.`);
    //     else {
    //         /* firebaseCloudMessaging.sendToDevice(devices, payload); */
    //         payload.tokens = devices;
    //         firebaseCloudMessaging.sendMulticast(payload);
    //     }
    //     return devices;
    // }

    async sendEmail(
        user: User | number,
        template: EMAIL_TEMPLATES,
        locals: { [key: string]: any },
        customEmail?: string,
    ): Promise<void> {
        const userRepository = await this.userRepositoryGetter();

        if (isNumber(user)) user = await userRepository.findById(user);

        this.emailService.emailSender
            .send({
                template,
                message: {
                    to: customEmail ? customEmail : user.email,
                },
                locals,
            })
            .then((res: any) => {
                console.log(
                    chalk.greenBright(
                        `Email sent. Template: ${template} - To: ${customEmail ? customEmail : (user as User).email}`,
                    ),
                );
            })
            .catch((error: any) => {
                console.error(
                    chalk.redBright(
                        `Error sending email. Template: ${template} - To: ${
                            customEmail ? customEmail : (user as User).email
                        }. Error: `,
                        error,
                    ),
                );
            });
    }

    async compareId(user: User, id: number) {
        return user.id === id;
    }
}
