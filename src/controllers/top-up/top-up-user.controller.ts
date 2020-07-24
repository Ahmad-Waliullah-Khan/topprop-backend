import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { TopUp, User } from '@src/models';
import { TopUpRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class TopUpUserController {
    constructor(
        @repository(TopUpRepository)
        public topUpRepository: TopUpRepository,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_USER)] })
    @get(API_ENDPOINTS.TOP_UPS.USER, {
        responses: {
            '200': {
                description: 'User belonging to TopUp',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(User) },
                    },
                },
            },
        },
    })
    async getUser(@param.path.number('id') id: typeof TopUp.prototype.id): Promise<ICommonHttpResponse<User>> {
        return { data: await this.topUpRepository.user(id) };
    }
}
