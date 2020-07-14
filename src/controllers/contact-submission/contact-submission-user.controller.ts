import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { ContactSubmission, User } from '@src/models';
import { ContactSubmissionRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class ContactSubmissionUserController {
    constructor(
        @repository(ContactSubmissionRepository)
        public contactSubmissionRepository: ContactSubmissionRepository,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_USER)] })
    @get(API_ENDPOINTS.CONTACT_SUBMISSIONS.USER, {
        responses: {
            '200': {
                description: 'User belonging to ContactSubmission',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(User) },
                    },
                },
            },
        },
    })
    async getUser(
        @param.path.number('id') id: typeof ContactSubmission.prototype.id,
    ): Promise<ICommonHttpResponse<User>> {
        return { data: await this.contactSubmissionRepository.user(id) };
    }
}
