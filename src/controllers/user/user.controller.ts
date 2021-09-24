import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {Count, CountSchema, Filter, FilterExcludingWhere, repository, Where} from '@loopback/repository';
import {del, get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId} from '@loopback/security';
import {User} from '@src/models';
import {UserRepository} from '@src/repositories';
import {JwtService} from '@src/services';
import {UserService} from '@src/services/user.service';
import {API_ENDPOINTS, EMAIL_TEMPLATES, PERMISSIONS, ROLES, RUN_TYPE} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {
    EmailRequest,
    ICommonHttpResponse,
    ICustomUserProfile,
    LoginCredentials,
    ResetPasswordRequest,
    SignupUserRequest
} from '@src/utils/interfaces';
import {COMMON_MESSAGES, USER_MESSAGES} from '@src/utils/messages';
import {USER_VALIDATORS} from '@src/utils/validators';
import {isEmpty, isEqual} from 'lodash';
import moment from 'moment';
import Schema from 'validate';

export class UserController {
    constructor(
        @repository(UserRepository)
        public userRepository: UserRepository,
        @service() protected userService: UserService,
        @service() protected jwtService: JwtService,
    ) {}

    @post(API_ENDPOINTS.USERS.SIGNUP, {
        responses: {
            '200': {
                description: 'User model instance',
                content: { 'application/json': { schema: getModelSchemaRef(User) } },
            },
        },
    })
    async signup(
        @requestBody({
            content: {
                'application/json': {
                    schema: { additionalProperties: true },
                },
            },
        })
        body: SignupUserRequest,
    ): Promise<{ data: string; user: User }> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            fullName: USER_VALIDATORS.fullName,
            username: USER_VALIDATORS.username,
            email: USER_VALIDATORS.email,
            password: USER_VALIDATORS.password,
            confirmPassword: USER_VALIDATORS.confirmPassword,
            signUpState: USER_VALIDATORS.state,
            dateOfBirth: USER_VALIDATORS.dateOfBirth,
        };
        const clientHost = process.env.CLIENT_HOST;

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        //Validate User State

        if (body.signUpState === undefined || body.signUpState === null || body.signUpState === '') {
            throw new HttpErrors.BadRequest(USER_MESSAGES.STATE_NOT_DETECTED);
        }

        const validState = await this.userService.validState(body.signUpState);
        if (!validState) throw new HttpErrors.BadRequest(`${body.signUpState} ${USER_MESSAGES.STATE_INVALID}`);

        if (body.signUpCountry === undefined || body.signUpCountry === null || body.signUpCountry === '') {
            throw new HttpErrors.BadRequest(USER_MESSAGES.CONUTRY_NOT_DETECTED);
        }

        const validCountry = await this.userService.validCountry(body.signUpCountry || '');
        if (!validCountry) throw new HttpErrors.BadRequest(`${body.signUpCountry} ${USER_MESSAGES.COUNTRY_INVALID}`);

        //LOWER CASING THE EMAIL
        body.email = body.email.toLowerCase();

        //Validate email before save
        const validEmail = await this.userService.validEmail(body.email);
        if (!validEmail) throw new HttpErrors.BadRequest(USER_MESSAGES.EMAIL_ALREADY_USED);

        //Validate username before save
        const validUsername = await this.userService.validUsername(body.username);
        if (!validUsername) throw new HttpErrors.BadRequest(USER_MESSAGES.USERNAME_ALREADY_USED);

        body.hash = await this.userService.setPassword(body.password as string);
        if (isEqual(body.email, process.env.ADMIN_EMAIL)) {
            body.permissions = this.userService.assignDefaultPermissions(true);
            body.role = this.userService.assignDefaultRole(true);
            body.accountConfirmedAt = moment().toDate();
        } else {
            body.permissions = this.userService.assignDefaultPermissions();
            body.role = this.userService.assignDefaultRole();
            // body.confirmAccountToken = this.userService.setConfirmAccountToken();
            //TODO: HARDCODED FIELD BECAUSE OF MVP PURPOSES
            body.accountConfirmedAt = moment().toDate();
        }

        delete body.password;
        delete body.confirmPassword;
        delete body.signUpCountry;
        const user = await this.userRepository.create(body);
        const token = await this.jwtService.generateToken({
            id: user.id,
            email: user.email,
            username: user.username,
            [securityId]: user.id.toString(),
            isAdmin: isEqual(user.role, ROLES.ADMIN),
        });

        this.userService.sendEmail(user, EMAIL_TEMPLATES.WELCOME, {
            user,
            text: {
                title: `Welcome to TopProp!`,
                subtitle: ``,
            },
            link: {
                url: `${clientHost}`,
                text: 'Start your journey here',
            },
        });

        return { data: token, user };
    }

    @post(API_ENDPOINTS.USERS.ADMIN_LOGIN, {
        responses: {
            '200': {
                description: 'Token',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    async adminLogin(
        @requestBody()
        credentials: LoginCredentials,
    ): Promise<ICommonHttpResponse> {
        if (!credentials || isEmpty(credentials)) throw new HttpErrors.BadRequest(USER_MESSAGES.EMPTY_CREDENTIALS);

        const validationSchema = {
            password: USER_VALIDATORS.password,
            emailOrUsername: USER_VALIDATORS.emailOrUsername,
        };

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(credentials);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        // ensure the user exists, and the password is correct
        const user = await this.userService.verifyCredentials(credentials, true);
        const token = await this.jwtService.generateToken({
            id: user.id,
            email: user.email,
            username: user.username,
            [securityId]: user.id.toString(),
            isAdmin: isEqual(user.role, ROLES.ADMIN),
        });

        return { data: token };
    }

    @post(API_ENDPOINTS.USERS.LOGIN, {
        responses: {
            '200': {
                description: 'Token',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    async userLogin(
        @requestBody()
        credentials: LoginCredentials,
    ): Promise<ICommonHttpResponse> {
        const validationSchema = {
            password: USER_VALIDATORS.simplePassword,
            emailOrUsername: USER_VALIDATORS.emailOrUsername,
        };

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(credentials);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        // ensure the user exists, and the password is correct
        const user = await this.userService.verifyCredentials(credentials);
        const token = await this.jwtService.generateToken({
            id: user.id,
            email: user.email,
            username: user.username,
            [securityId]: user.id.toString(),
            isAdmin: isEqual(user.role, ROLES.ADMIN),
        });

        return {
            data: {
                 token,
                 type: RUN_TYPE,
                 "DWOLLA_ENV": process.env.DWOLLA_ENV,
                 "COMET_APP_ID": process.env.COMET_APPID,
                 "COMET_AUTH_KEY": process.env.COMET_AUTH_KEY,
                 "COMET_API_KEY": process.env.COMET_APP_API_KEY,
                 "COMET_REGION": process.env.COMET_REGION,
                }
            };
    }

    @authenticate('facebookToken')
    @post(API_ENDPOINTS.USERS.FACEBOOK_LOGIN, {
        responses: {
            '200': {
                description: 'Token',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    async facebookLogin(
        @inject(SecurityBindings.USER) user: ICustomUserProfile,
        @requestBody() body: { access_token: string },
    ): Promise<ICommonHttpResponse> {
        if (!user) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

        const token = await this.jwtService.generateToken({
            id: user.id,
            email: user.email,
            username: user.username,
            [securityId]: user.id.toString(),
            isAdmin: isEqual(user.role, ROLES.ADMIN),
        });
        return { data: token };
    }

    @authenticate('googleToken')
    @post(API_ENDPOINTS.USERS.GOOGLE_LOGIN, {
        responses: {
            '200': {
                description: 'Token',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    async googleLogin(
        @inject(SecurityBindings.USER) user: ICustomUserProfile,
        @requestBody() body: { access_token: string },
    ): Promise<ICommonHttpResponse> {
        if (!user) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

        const token = await this.jwtService.generateToken({
            id: user.id,
            email: user.email,
            username: user.username,
            [securityId]: user.id.toString(),
            isAdmin: isEqual(user.role, ROLES.ADMIN),
        });
        return { data: token };
    }

    @post(API_ENDPOINTS.USERS.USERNAME_VALIDATE)
    async validateUsername(@requestBody() body: Pick<User, 'username'>): Promise<ICommonHttpResponse<boolean>> {
        const validationSchema = {
            username: USER_VALIDATORS.username,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        return {
            data: await this.userService.validUsername(body.username),
        };
        // let username = this.userService.buildUsername('murder05kill@gmail.com');
        // console.log(username);
        // console.log(username.length);
        // return { data: true };
    }

    @patch(API_ENDPOINTS.USERS.SET_FORGOT_PASSWORD_TOKEN)
    async setForgotPasswordToken(
        @requestBody()
        body: Pick<User, 'email'>,
    ): Promise<ICommonHttpResponse> {
        const validationSchema = {
            email: USER_VALIDATORS.email,
        };

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const user = await this.userRepository.findOne({ where: { email: body.email } });

        if (!user) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
        if (user.socialId) throw new HttpErrors.NotFound(USER_MESSAGES.LOGGED_IN_WITH_SOCIAL_NETWORK);

        if (user.forgotPasswordToken && user.forgotPasswordTokenExpiresIn) {
            const forgotTokenExpired = this.userService.isForgotPasswordTokenExpired(user.forgotPasswordTokenExpiresIn);
            if (!forgotTokenExpired) throw new HttpErrors.TooManyRequests(USER_MESSAGES.FORGOT_EMAIL_ALREADY_SENT);
        }

        const newUser = this.userService.setForgotPasswordFields(user);

        const clientHost = process.env.CLIENT_HOST;

        await this.userRepository.save(newUser);
        this.userService.sendEmail(newUser, EMAIL_TEMPLATES.FORGOT_PASSWORD, {
            user: newUser,
            // forgotPasswordToken: newUser.forgotPasswordToken,
            text: {
                title: `Hey ${newUser ? newUser.fullName : ''}`,
                subtitle: `
                `,
            },
            link: `${clientHost}/reset-password/${newUser.forgotPasswordToken}`,
        });

        return { message: 'Check you inbox.' };
    }

    @patch(API_ENDPOINTS.USERS.RESET_PASSWORD)
    async resetPassword(
        @requestBody()
        body: ResetPasswordRequest,
    ): Promise<ICommonHttpResponse> {
        const validationSchema = {
            password: USER_VALIDATORS.password,
            confirmPassword: USER_VALIDATORS.confirmPassword,
            forgotPasswordToken: USER_VALIDATORS.forgotPasswordToken,
        };

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const user = await this.userRepository.findOne({
            where: { forgotPasswordToken: body.forgotPasswordToken },
        });

        if (!user) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
        if (
            user.forgotPasswordTokenExpiresIn &&
            this.userService.isForgotPasswordTokenExpired(user.forgotPasswordTokenExpiresIn)
        )
            throw new HttpErrors.BadRequest(USER_MESSAGES.RESET_PASS_TOKEN_EXPIRED);

        const hash = await this.userService.setPassword(body.password);
        user.hash = hash;
        user.forgotPasswordToken = null;
        user.forgotPasswordTokenExpiresIn = null;
        const newUser = await this.userRepository.save(user);
        this.userService.sendEmail(user, EMAIL_TEMPLATES.NEW_PASSWORD_SET, {
            user: newUser,
            text: {
                title: `Top Prop - New Password Set`,
                subtitle: `You have successfully set a new password.`,
            },
        });

        return { message: 'Password reset successfully.' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.COUNT_USERS)] })
    @get(API_ENDPOINTS.USERS.COUNT, {
        responses: {
            '200': {
                description: 'User model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(User) where?: Where<User>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.userRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ALL_USERS)] })
    @get(API_ENDPOINTS.USERS.CRUD, {
        responses: {
            '200': {
                description: 'Array of User model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(User, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(User) filter?: Filter<User>): Promise<ICommonHttpResponse<User[]>> {
        return { data: await this.userRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.USERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'User PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(User, { partial: true }),
    //             },
    //         },
    //     })
    //     user: User,
    //     @param.where(User) where?: Where<User>,
    // ): Promise<Count> {
    //     return this.userRepository.updateAll(user, where);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_USER)] })
    @get(API_ENDPOINTS.USERS.BY_ID, {
        responses: {
            '200': {
                description: 'User model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(User, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(User, { exclude: 'where' }) filter?: FilterExcludingWhere<User>,
    ): Promise<ICommonHttpResponse<User>> {
        return { data: await this.userRepository.findById(id, filter) };
    }

    // @authenticate('jwt')
    // @patch(API_ENDPOINTS.USERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'User PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(User, { partial: true }),
    //             },
    //         },
    //     })
    //     user: User,
    // ): Promise<void> {
    //     await this.userRepository.updateById(id, user);
    // }

    // @put(API_ENDPOINTS.USERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'User PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() user: User): Promise<void> {
    //     await this.userRepository.replaceById(id, user);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.DELETE_ANY_USER)] })
    @del(API_ENDPOINTS.USERS.BY_ID, {
        responses: {
            '204': {
                description: 'User DELETE success',
            },
        },
    })
    async deleteById(@param.path.number('id') id: number): Promise<void> {
        await this.userRepository.deleteById(id);
    }

    @authenticate('jwt')
    @post(API_ENDPOINTS.USERS.EMAIL, {
        responses: {
            '200': {
                description: 'Email Template',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    async userEmail(
        @requestBody()
        body: EmailRequest,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse> {
        const validationSchema = {
            receiverEmail: USER_VALIDATORS.email,
        };

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        if (!body.senderId) body.senderId = +currentUser[securityId];

        const user = await this.userRepository.findById(body.senderId);

        const league = {
            name: 'League Name',
        };

        const invitee = {
            name: '',
        };

        const receiverEmail = body.receiverEmail;
        await this.userService.sendEmail(
            user,
            EMAIL_TEMPLATES.LEAGUE_INVITE,
            {
                user: {
                    fullName: invitee.name,
                },
                receiverEmail,
                text: {
                    title: `You have invited to ${league.name}`,
                    subtitle: `This league invite was sent to you by ${user.fullName}.Please click on the link below to accept the join the league`,
                },
                link: {
                    url: 'https://google.com/',
                    text: 'Join League',
                },
            },
            body.receiverEmail,
        );

        return {
            message: USER_MESSAGES.EMIL_SENT,
            data: { email: receiverEmail },
        };
    }
}
