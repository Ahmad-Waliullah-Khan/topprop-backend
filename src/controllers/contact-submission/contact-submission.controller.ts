import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {service} from '@loopback/core';
import {Count, CountSchema, Filter, FilterExcludingWhere, repository, Where} from '@loopback/repository';
import {del, get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {ContactSubmission, User} from '@src/models';
import {ContactSubmissionRepository} from '@src/repositories';
import {UserService} from '@src/services';
import {API_ENDPOINTS, EMAIL_TEMPLATES, PERMISSIONS} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse} from '@src/utils/interfaces';
import {CONTACT_SUBMISSION_MESSAGES} from '@src/utils/messages';
import {CONTACT_SUBMISSION_VALIDATORS} from '@src/utils/validators';
import moment from 'moment';
import Schema, {SchemaDefinition} from 'validate';

export class ContactSubmissionController {
    constructor(
        @repository(ContactSubmissionRepository)
        public contactSubmissionRepository: ContactSubmissionRepository,
        @service() private userService: UserService,
    ) { }

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.CREATE_ANY_CONTACT_SUBMISSION),
        ],
    })
    @post(API_ENDPOINTS.CONTACT_SUBMISSIONS.CRUD, {
        responses: {
            '200': {
                description: 'ContactSubmission model instance',
                content: {'application/json': {schema: getModelSchemaRef(ContactSubmission)}},
            },
        },
    })
    async create(
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(ContactSubmission, {
                        title: 'NewContactSubmission',
                        partial: true,
                    }),
                },
            },
        })
        body: Partial<ContactSubmission>,
    ): Promise<ICommonHttpResponse<ContactSubmission>> {
        const validationSchema: SchemaDefinition = {
            userId: CONTACT_SUBMISSION_VALIDATORS.userId,
            message: CONTACT_SUBMISSION_VALIDATORS.message,
        };

        const validation = new Schema(validationSchema, {strip: true});
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        return {data: await this.contactSubmissionRepository.create(body)};
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.COUNT_CONTACT_SUBMISSIONS)],
    })
    @get(API_ENDPOINTS.CONTACT_SUBMISSIONS.COUNT, {
        responses: {
            '200': {
                description: 'ContactSubmission model count',
                content: {'application/json': {schema: CountSchema}},
            },
        },
    })
    async count(@param.where(ContactSubmission) where?: Where<ContactSubmission>): Promise<ICommonHttpResponse<Count>> {
        return {data: await this.contactSubmissionRepository.count(where)};
    }

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.VIEW_ALL_CONTACT_SUBMISSIONS),
        ],
    })
    @get(API_ENDPOINTS.CONTACT_SUBMISSIONS.CRUD, {
        responses: {
            '200': {
                description: 'Array of ContactSubmission model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(ContactSubmission, {includeRelations: true}),
                        },
                    },
                },
            },
        },
    })
    async find(
        @param.filter(ContactSubmission) filter?: Filter<ContactSubmission>,
    ): Promise<ICommonHttpResponse<ContactSubmission[]>> {
        return {data: await this.contactSubmissionRepository.find(filter)};
    }

    // @patch(API_ENDPOINTS.CONTACT_SUBMISSIONS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'ContactSubmission PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(ContactSubmission, { partial: true }),
    //             },
    //         },
    //     })
    //     contactSubmission: ContactSubmission,
    //     @param.where(ContactSubmission) where?: Where<ContactSubmission>,
    // ): Promise<Count> {
    //     return this.contactSubmissionRepository.updateAll(contactSubmission, where);
    // }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.VIEW_ANY_CONTACT_SUBMISSION)],
    })
    @get(API_ENDPOINTS.CONTACT_SUBMISSIONS.BY_ID, {
        responses: {
            '200': {
                description: 'ContactSubmission model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(ContactSubmission, {includeRelations: true}),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(ContactSubmission, {exclude: 'where'}) filter?: FilterExcludingWhere<ContactSubmission>,
    ): Promise<ICommonHttpResponse<ContactSubmission>> {
        return {data: await this.contactSubmissionRepository.findById(id, filter)};
    }

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.UN_READ_ANY_CONTACT_SUBMISSION),
        ],
    })
    @patch(API_ENDPOINTS.CONTACT_SUBMISSIONS.READ, {
        responses: {
            '204': {
                description: 'ContactSubmission PATCH success',
            },
        },
    })
    async read(@param.path.number('id') id: number): Promise<ICommonHttpResponse<ContactSubmission>> {
        if (!(await this.contactSubmissionRepository.exists(id)))
            throw new HttpErrors.NotFound(CONTACT_SUBMISSION_MESSAGES.CONTACT_SUBMISSION_NOT_FOUND);

        const contactSubmission = await this.contactSubmissionRepository.findById(id);
        if (contactSubmission.read)
            throw new HttpErrors.NotAcceptable(CONTACT_SUBMISSION_MESSAGES.CONTACT_SUBMISSION_ALREADY_READ);

        contactSubmission.read = true;
        contactSubmission.readAt = moment().toDate();
        return {data: await this.contactSubmissionRepository.save(contactSubmission)};
    }

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.UN_READ_ANY_CONTACT_SUBMISSION),
        ],
    })
    @patch(API_ENDPOINTS.CONTACT_SUBMISSIONS.UNREAD, {
        responses: {
            '204': {
                description: 'ContactSubmission PATCH success',
            },
        },
    })
    async unread(@param.path.number('id') id: number): Promise<ICommonHttpResponse<ContactSubmission>> {
        if (!(await this.contactSubmissionRepository.exists(id)))
            throw new HttpErrors.NotFound(CONTACT_SUBMISSION_MESSAGES.CONTACT_SUBMISSION_NOT_FOUND);

        const contactSubmission = await this.contactSubmissionRepository.findById(id);
        if (!contactSubmission.read)
            throw new HttpErrors.NotAcceptable(CONTACT_SUBMISSION_MESSAGES.CONTACT_SUBMISSION_ALREADY_UNREAD);

        contactSubmission.read = false;
        contactSubmission.readAt = null;
        return {data: await this.contactSubmissionRepository.save(contactSubmission)};
    }

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.REPLY_ANY_CONTACT_SUBMISSION),
        ],
    })
    @patch(API_ENDPOINTS.CONTACT_SUBMISSIONS.REPLY, {
        responses: {
            '204': {
                description: 'ContactSubmission PATCH success',
            },
        },
    })
    async reply(
        @param.path.number('id') id: number,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(ContactSubmission, {partial: true}),
                },
            },
        })
        body: ContactSubmission,
    ): Promise<ICommonHttpResponse<ContactSubmission>> {
        const validationSchema: SchemaDefinition = {
            message: CONTACT_SUBMISSION_VALIDATORS.message,
        };

        const validation = new Schema(validationSchema, {strip: true});
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        if (!(await this.contactSubmissionRepository.exists(id)))
            throw new HttpErrors.NotFound(CONTACT_SUBMISSION_MESSAGES.CONTACT_SUBMISSION_NOT_FOUND);

        const contactSubmission = await this.contactSubmissionRepository.findById(id, {
            include: [{relation: 'user'}],
        });
        if (contactSubmission.repliedAt && contactSubmission.reply)
            throw new HttpErrors.NotAcceptable(CONTACT_SUBMISSION_MESSAGES.CONTACT_SUBMISSION_ALREADY_REPLIED);
        contactSubmission.reply = body.message;
        contactSubmission.repliedAt = moment().toDate();
        this.userService.sendEmail(contactSubmission.user as User, EMAIL_TEMPLATES.CONTACT_SUBMISSION_REPLIED, {
            user: contactSubmission.user as User,
            message: contactSubmission.message,
            messageDate: moment(contactSubmission.createdAt).format('MM/DD/YYYY'),
            messageTime: moment(contactSubmission.createdAt).format('hh:mm a'),
            reply: contactSubmission.reply,
            replyDate: moment(contactSubmission.repliedAt).format('MM/DD/YYYY'),
            replyTime: moment(contactSubmission.repliedAt).format('hh:mm a'),
            text: {
                title: `TopProp - Contact Submission Replied`,
                subtitle: `The admin team has got back to your contact submission. Here are the details. Original Message sent on ${moment(contactSubmission.createdAt).format('MM/DD/YYYY')}, at ${moment(contactSubmission.createdAt).format('hh:mm a')}: ${contactSubmission.message} | Admin Reply sent on ${moment(contactSubmission.repliedAt).format('MM/DD/YYYY')} at ${moment(contactSubmission.repliedAt).format('hh:mm a')}: ${contactSubmission.reply}`,
            }
        });

        delete contactSubmission.user;
        return {data: await this.contactSubmissionRepository.save(contactSubmission)};
    }

    // @put(API_ENDPOINTS.CONTACT_SUBMISSIONS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'ContactSubmission PUT success',
    //         },
    //     },
    // })
    // async replaceById(
    //     @param.path.number('id') id: number,
    //     @requestBody() contactSubmission: ContactSubmission,
    // ): Promise<void> {
    //     await this.contactSubmissionRepository.replaceById(id, contactSubmission);
    // }

    @authenticate('jwt')
    @authorize({
        voters: [
            AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTACT_SUBMISSIONS.DELETE_ANY_CONTACT_SUBMISSION),
        ],
    })
    @del(API_ENDPOINTS.CONTACT_SUBMISSIONS.BY_ID, {
        responses: {
            '204': {
                description: 'ContactSubmission DELETE success',
            },
        },
    })
    async deleteById(@param.path.number('id') id: number): Promise<void> {
        await this.contactSubmissionRepository.deleteById(id);
    }
}
