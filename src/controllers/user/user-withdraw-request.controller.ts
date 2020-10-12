/* import { Count, CountSchema, Filter, repository, Where } from '@loopback/repository';
import { del, get, getModelSchemaRef, getWhereSchemaFor, param, patch, post, requestBody } from '@loopback/rest';
import { User, WithdrawRequest } from '../models';
import { UserRepository } from '../repositories';

export class UserWithdrawRequestController {
    constructor(@repository(UserRepository) protected userRepository: UserRepository) {}

    @get('/users/{id}/withdraw-requests', {
        responses: {
            '200': {
                description: 'Array of User has many WithdrawRequest',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(WithdrawRequest) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<WithdrawRequest>,
    ): Promise<WithdrawRequest[]> {
        return this.userRepository.withdrawRequests(id).find(filter);
    }

    @post('/users/{id}/withdraw-requests', {
        responses: {
            '200': {
                description: 'User model instance',
                content: { 'application/json': { schema: getModelSchemaRef(WithdrawRequest) } },
            },
        },
    })
    async create(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(WithdrawRequest, {
                        title: 'NewWithdrawRequestInUser',
                        exclude: ['id'],
                        optional: ['userId'],
                    }),
                },
            },
        })
        withdrawRequest: Omit<WithdrawRequest, 'id'>,
    ): Promise<WithdrawRequest> {
        return this.userRepository.withdrawRequests(id).create(withdrawRequest);
    }

    @patch('/users/{id}/withdraw-requests', {
        responses: {
            '200': {
                description: 'User.WithdrawRequest PATCH success count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async patch(
        @param.path.number('id') id: number,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(WithdrawRequest, { partial: true }),
                },
            },
        })
        withdrawRequest: Partial<WithdrawRequest>,
        @param.query.object('where', getWhereSchemaFor(WithdrawRequest)) where?: Where<WithdrawRequest>,
    ): Promise<Count> {
        return this.userRepository.withdrawRequests(id).patch(withdrawRequest, where);
    }

    @del('/users/{id}/withdraw-requests', {
        responses: {
            '200': {
                description: 'User.WithdrawRequest DELETE success count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async delete(
        @param.path.number('id') id: number,
        @param.query.object('where', getWhereSchemaFor(WithdrawRequest)) where?: Where<WithdrawRequest>,
    ): Promise<Count> {
        return this.userRepository.withdrawRequests(id).delete(where);
    }
}
 */
