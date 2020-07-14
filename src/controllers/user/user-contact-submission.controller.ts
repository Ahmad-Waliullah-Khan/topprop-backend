import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject } from '@loopback/core';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { ContactSubmission, User } from '@src/models';
import { UserRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, ICustomUserProfile } from '@src/utils/interfaces';
import { USER_MESSAGES } from '@src/utils/messages';
import { CONTACT_SUBMISSION_VALIDATORS } from '@src/utils/validators';
import Schema, { SchemaDefinition } from 'validate';

export class UserContactSubmissionController {
    constructor(@repository(UserRepository) protected userRepository: UserRepository) {}

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.VIEW_ALL_CONTACT_SUBMISSIONS),
        ],
    })
    @get(API_ENDPOINTS.USERS.CONTACT_SUBMISSIONS.CRUD, {
        responses: {
            '200': {
                description: 'Array of User has many ContactSubmission',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(ContactSubmission) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<ContactSubmission>,
    ): Promise<ICommonHttpResponse<ContactSubmission[]>> {
        return { data: await this.userRepository.contactSubmissions(id).find(filter) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.CREATE_ANY_CONTACT_SUBMISSION),
        ],
    })
    @post(API_ENDPOINTS.USERS.CONTACT_SUBMISSIONS.CRUD, {
        responses: {
            '200': {
                description: 'User model instance',
                content: { 'application/json': { schema: getModelSchemaRef(ContactSubmission) } },
            },
        },
    })
    async create(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(ContactSubmission, {
                        title: 'NewContactSubmissionInUser',
                        exclude: ['id'],
                        optional: ['userId'],
                        partial: true,
                    }),
                },
            },
        })
        body: Partial<ContactSubmission>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<ContactSubmission>> {
        if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

        if (!body.userId) body.userId = +currentUser[securityId];

        const validationSchema: SchemaDefinition = {
            userId: CONTACT_SUBMISSION_VALIDATORS.userId,
            message: CONTACT_SUBMISSION_VALIDATORS.message,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        return { data: await this.userRepository.contactSubmissions(id).create(body) };
    }

    // @patch(API_ENDPOINTS.USERS.CONTACT_SUBMISSIONS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'User.ContactSubmission PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async patch(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(ContactSubmission, { partial: true }),
    //             },
    //         },
    //     })
    //     contactSubmission: Partial<ContactSubmission>,
    //     @param.query.object('where', getWhereSchemaFor(ContactSubmission)) where?: Where<ContactSubmission>,
    // ): Promise<Count> {
    //     return this.userRepository.contactSubmissions(id).patch(contactSubmission, where);
    // }

    // @del(API_ENDPOINTS.USERS.CONTACT_SUBMISSIONS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'User.ContactSubmission DELETE success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async delete(
    //     @param.path.number('id') id: number,
    //     @param.query.object('where', getWhereSchemaFor(ContactSubmission)) where?: Where<ContactSubmission>,
    // ): Promise<Count> {
    //     return this.userRepository.contactSubmissions(id).delete(where);
    // }
}
