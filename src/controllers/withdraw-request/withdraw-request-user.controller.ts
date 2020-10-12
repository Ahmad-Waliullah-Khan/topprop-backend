/* import { repository } from '@loopback/repository';
import { param, get, getModelSchemaRef } from '@loopback/rest';
import { WithdrawRequest, User } from '../models';
import { WithdrawRequestRepository } from '../repositories';

export class WithdrawRequestUserController {
    constructor(
        @repository(WithdrawRequestRepository)
        public withdrawRequestRepository: WithdrawRequestRepository,
    ) {}

    @get('/withdraw-requests/{id}/user', {
        responses: {
            '200': {
                description: 'User belonging to WithdrawRequest',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(User) },
                    },
                },
            },
        },
    })
    async getUser(@param.path.number('id') id: typeof WithdrawRequest.prototype.id): Promise<User> {
        return this.withdrawRequestRepository.user(id);
    }
}
 */
