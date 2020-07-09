import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { del, get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody } from '@loopback/rest';
import { securityId } from '@loopback/security';
import { User } from '@src/models';
import { UserRepository } from '@src/repositories';
import { JwtService } from '@src/services';
import { UserService } from '@src/services/user.service';
import { API_ENDPOINTS, EMAIL_TEMPLATES, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, LoginCredentials, SignupUserRequest } from '@src/utils/interfaces';
import { COMMON_MESSAGES, USER_MESSAGES } from '@src/utils/messages';
import { USER_VALIDATORS } from '@src/utils/validators';
import { isEmpty, isEqual } from 'lodash';
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
        };

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        //LOWER CASING THE EMAIL
        body.email = body.email.toLowerCase();

        //TODO: HARDCODED FIELD BECAUSE OF MVP PURPOSES
        body.accountConfirmedAt = moment().toDate();

        //Validate email before save
        const validEmail = await this.userService.validEmail(body.email);
        if (!validEmail) throw new HttpErrors.BadRequest(USER_MESSAGES.EMAIL_ALREADY_USED);

        //Validate username before save
        const validUsername = await this.userService.validUsername(body.username);
        if (!validUsername) throw new HttpErrors.BadRequest(USER_MESSAGES.USERNAME_ALREADY_USED);

        body.hash = await this.userService.setPassword(body.password);
        if (isEqual(body.email, process.env.ADMIN_EMAIL)) {
            body.permissions = this.userService.assignDefaultPermissions(true);
            body.role = this.userService.assignDefaultRole(true);
            body.accountConfirmedAt = moment().toDate();
        } else {
            body.permissions = this.userService.assignDefaultPermissions();
            body.role = this.userService.assignDefaultRole();
            body.confirmAccountToken = this.userService.setConfirmAccountToken();
        }
        delete body.password;
        delete body.confirmPassword;
        const user = await this.userRepository.create(body);
        let token = await this.jwtService.generateToken({
            id: user.id.toString(),
            email: user.email,
            [securityId]: user.id.toString(),
        });

        this.userService.sendEmail(user, EMAIL_TEMPLATES.WELCOME, { user });

        return { data: token, user };
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
            id: user.id.toString(),
            email: user.email,
            [securityId]: user.id.toString(),
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
            password: USER_VALIDATORS.password,
            emailOrUsername: USER_VALIDATORS.emailOrUsername,
        };

        const validation = new Schema(validationSchema, { strip: false });
        const validationErrors = validation.validate(credentials);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        // ensure the user exists, and the password is correct
        const user = await this.userService.verifyCredentials(credentials);
        const token = await this.jwtService.generateToken({
            id: user.id.toString(),
            email: user.email,
            [securityId]: user.id.toString(),
        });

        return { data: token };
    }

    @authenticate('jwt')
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
    async find(@param.filter(User) filter?: Filter<User>): Promise<User[]> {
        return this.userRepository.find(filter);
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
    ): Promise<User> {
        return this.userRepository.findById(id, filter);
    }

    @authenticate('jwt')
    @patch(API_ENDPOINTS.USERS.BY_ID, {
        responses: {
            '204': {
                description: 'User PATCH success',
            },
        },
    })
    async updateById(
        @param.path.number('id') id: number,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(User, { partial: true }),
                },
            },
        })
        user: User,
    ): Promise<void> {
        await this.userRepository.updateById(id, user);
    }

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
}
