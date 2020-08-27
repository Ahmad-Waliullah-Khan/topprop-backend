import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Gain } from '@src/models';
import { UserRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class UserGainController {
    constructor(@repository(UserRepository) protected userRepository: UserRepository) {}
    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.GAINS.VIEW_ALL_GAINS)],
    })
    @get(API_ENDPOINTS.USERS.GAINS.CRUD, {
        responses: {
            '200': {
                description: 'Array of User has many Gain',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Gain) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<Gain>,
    ): Promise<ICommonHttpResponse<Gain[]>> {
        return { data: await this.userRepository.gains(id).find(filter) };
    }

    // @post('/users/{id}/gains', {
    //     responses: {
    //         '200': {
    //             description: 'User model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Gain) } },
    //         },
    //     },
    // })
    // async create(
    //     @param.path.number('id') id: typeof User.prototype.id,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Gain, {
    //                     title: 'NewGainInUser',
    //                     exclude: ['id'],
    //                     optional: ['userId'],
    //                 }),
    //             },
    //         },
    //     })
    //     gain: Omit<Gain, 'id'>,
    // ): Promise<Gain> {
    //     return this.userRepository.gains(id).create(gain);
    // }

    // @patch('/users/{id}/gains', {
    //     responses: {
    //         '200': {
    //             description: 'User.Gain PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async patch(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Gain, { partial: true }),
    //             },
    //         },
    //     })
    //     gain: Partial<Gain>,
    //     @param.query.object('where', getWhereSchemaFor(Gain)) where?: Where<Gain>,
    // ): Promise<Count> {
    //     return this.userRepository.gains(id).patch(gain, where);
    // }

    // @del('/users/{id}/gains', {
    //     responses: {
    //         '200': {
    //             description: 'User.Gain DELETE success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async delete(
    //     @param.path.number('id') id: number,
    //     @param.query.object('where', getWhereSchemaFor(Gain)) where?: Where<Gain>,
    // ): Promise<Count> {
    //     return this.userRepository.gains(id).delete(where);
    // }
}
