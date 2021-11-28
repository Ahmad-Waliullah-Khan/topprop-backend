import {bind, BindingScope, Getter, service} from '@loopback/core';
import {Filter, repository, Where} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {User} from '@src/models';
import {UserRepository} from '@src/repositories';
import {EMAIL_TEMPLATES, ROLES} from '@src/utils/constants';
import {
    DEV_STATE_PERMISSIONS, DEV_VALID_COUNTRIES, FALLBACK_PERMISSIONS, VALID_COUNTRIES,
    VALID_STATE_PERMISSIONS
} from '@src/utils/constants/state.constants';
import {MiscHelpers, UserHelpers} from '@src/utils/helpers';
import {LoginCredentials} from '@src/utils/interfaces';
import {USER_MESSAGES} from '@src/utils/messages';
import {compare, hash} from 'bcrypt';
import {randomBytes} from 'crypto';
import {isEqual, isNumber, merge} from 'lodash';
import moment from 'moment';
import {EmailService} from './email.service';

@bind({ scope: BindingScope.SINGLETON })
export class UserService {
    private HASH_ROUNDS = 10;
    constructor(
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @service() private emailService: EmailService,
    ) {}

    async setPassword(password: string) {
        return hash(password, this.HASH_ROUNDS);
    }

    async validPassword(password: string, hashPassword: string) {
        return compare(password, hashPassword);
    }

    async verifyCredentials(credentials: LoginCredentials, verifyAdmin = false): Promise<any> {
        const verifyUserQuery: Filter<User> = {
            where: {
                and: [
                    {
                        or: [
                            { email: credentials.emailOrUsername.toLowerCase().trim() },
                            { username: credentials.emailOrUsername.trim() },
                        ],
                    },
                    { role: verifyAdmin ? ROLES.ADMIN : ROLES.USER },
                ],
            },
        };

        const blockedMinutes = 30;

        const userRepository = await this.userRepositoryGetter();
        const foundUser = await userRepository.findOne(verifyUserQuery);

        if (foundUser?.lockedTime) {
            const currentDateTime = moment();
            const lockedTime = moment(foundUser?.lockedTime);
            if (currentDateTime.isBefore(lockedTime, 'minute')) {
                const timeDifferenceInMinutes = Number(lockedTime.diff(currentDateTime, 'minutes')) + 1;
                const message =
                    timeDifferenceInMinutes === 1
                        ? `${timeDifferenceInMinutes} minute`
                        : `${timeDifferenceInMinutes} minutes`;
                throw new HttpErrors.BadRequest(`${USER_MESSAGES.ACCOUNT_TIMEOUT} ${message}`);
            }
        }

        const passwordMatched =
            (foundUser && (await this.validPassword(credentials.password, foundUser.hash as string))) || false;

        if (!foundUser || !passwordMatched) {
            if (foundUser) {
                const invalidLoginCount = Number(foundUser.invalidLoginCount);
                if (invalidLoginCount === 3) {
                    foundUser.lockedTime = moment().add(blockedMinutes, 'minutes').toDate().toString();
                    foundUser.invalidLoginCount = 0;
                    await userRepository.updateById(foundUser.id, foundUser);
                    throw new HttpErrors.BadRequest(
                        `${USER_MESSAGES.INVALID_CREDENTIALS_TIMEOUT} ${blockedMinutes} minutes`,
                    );
                } else {
                    foundUser.invalidLoginCount = invalidLoginCount + 1;
                    await userRepository.updateById(foundUser.id, foundUser);
                }
            }
            throw new HttpErrors.BadRequest(`${USER_MESSAGES.INVALID_CREDENTIALS} `);
        }

        if (credentials.state === undefined || credentials.state === null || credentials.state === '') {
            throw new HttpErrors.BadRequest(USER_MESSAGES.STATE_NOT_DETECTED);
        }

        // if (!(await this.validState(foundUser.signUpState || '')))
        // throw new HttpErrors.BadRequest(`${foundUser.signUpState} ${USER_MESSAGES.STATE_INVALID}`);

        if (credentials.country === undefined || credentials.country === null || credentials.country === '') {
            throw new HttpErrors.BadRequest(USER_MESSAGES.CONUTRY_NOT_DETECTED);
        }

        // if (!(await this.validCountry(credentials.country)))
        //     throw new HttpErrors.BadRequest(`${credentials.country} ${USER_MESSAGES.COUNTRY_INVALID}`);

        const config = await this.statePermissions(foundUser.signUpState || '', credentials.state || '');

        foundUser.lastLoginState = credentials.state;
        foundUser.lastLoginCountry = credentials.country;
        foundUser.invalidLoginCount = 0;
        foundUser.lockedTime = null;
        await userRepository.updateById(foundUser.id, foundUser);

        return { ...foundUser, config };
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
        user.forgotPasswordToken = randomBytes(12).toString('hex');
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
            const excludeWhere: Where<User> = {
                id: { nin: [excludeUserId] },
            };
            defaultWhere = merge(defaultWhere, excludeWhere);
        }
        const usersCount = await userRepository.count(defaultWhere);
        if (usersCount.count > 0) return false;
        return true;
    }

    buildUsername(email: string): string {
        const splittedEmail = email.split('@');
        const tentativeUsername = `@${splittedEmail[0]}`.substr(0, 5).replace('+', '-');
        const defaultUsername = MiscHelpers.appendRandomStr(`${tentativeUsername}-`, 20);
        return defaultUsername;
    }

    async validEmail(email: string, excludeUserId?: number): Promise<boolean> {
        const userRepository = await this.userRepositoryGetter();
        let defaultWhere: Where<User> = {
            email,
        };
        if (excludeUserId) {
            const excludeWhere: Where<User> = {
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
        if (isNumber(user)) {
            const userRepository = await this.userRepositoryGetter();
            user = await userRepository.findById(user);
        }

        this.emailService.sendEmail({
            template,
            message: {
                to: customEmail ? customEmail : user.email,
            },
            locals,
        });
    }

    async compareId(user: User, id: number): Promise<boolean> {
        return isEqual(user.id, id);
    }

    async statePermissions(signupState: string, signinState: string): Promise<any> {
        let validStatePermissions = VALID_STATE_PERMISSIONS;
        if (isEqual(process.env.GEOTRACKING_ENV, 'development')) {
            validStatePermissions = [...VALID_STATE_PERMISSIONS, ...DEV_STATE_PERMISSIONS];
        }
        const signUpPermissions =
            validStatePermissions.find(element => element.abbr === signupState) || FALLBACK_PERMISSIONS;
        const signInPermissions =
            validStatePermissions.find(element => element.abbr === signinState) || FALLBACK_PERMISSIONS;

        const permissions = {
            ...signInPermissions,
            minAge: signUpPermissions ? signUpPermissions.minAge : signInPermissions?.minAge,
            weeklyDepositLimit: signUpPermissions
                ? signUpPermissions.weeklyDepositLimit
                : signInPermissions?.weeklyDepositLimit,
        };

        return permissions;
    }

    async validState(state: string): Promise<boolean> {
        let validStatePermissions = VALID_STATE_PERMISSIONS;
        if (isEqual(process.env.GEOTRACKING_ENV, 'development')) {
            validStatePermissions = [...VALID_STATE_PERMISSIONS, ...DEV_STATE_PERMISSIONS];
        }
        const found = validStatePermissions.find(element => element.abbr === state);
        return found ? found.appAccess : false;
    }

    async validCountry(country: string): Promise<boolean> {
        let validCountries = VALID_COUNTRIES;
        if (isEqual(process.env.GEOTRACKING_ENV, 'development')) {
            validCountries = [...VALID_COUNTRIES, ...DEV_VALID_COUNTRIES];
        }
        return validCountries.includes(country);
    }

    async findById(id: typeof User.prototype.id): Promise<User | null> {
        return (await this.userRepositoryGetter()).findById(id);
    }
}
