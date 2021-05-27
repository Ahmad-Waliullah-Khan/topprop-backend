import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Contest, User } from '@src/models';
import { ContestRepository, UserRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class ContestUserController {
    constructor(
        @repository(ContestRepository)
        public contestRepository: ContestRepository,
        public userRepository: UserRepository,
    ) {}

    // @authenticate('jwt')
    // @authorize({
    //     voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_USER)],
    // })
    // @get(API_ENDPOINTS.CONTESTS.CREATOR, {
    //     responses: {
    //         '200': {
    //             description: 'User belonging to Contest',
    //             content: {
    //                 'application/json': {
    //                     schema: { type: 'array', items: getModelSchemaRef(User) },
    //                 },
    //             },
    //         },
    //     },
    // })
    // async getUser(@param.path.number('id') id: typeof Contest.prototype.id): Promise<ICommonHttpResponse<User>> {
    //     return { data: await this.userRepository.findOne(id) };
    // }
}
