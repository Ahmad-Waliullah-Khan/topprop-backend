import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Bet } from '@src/models';
import { UserRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class UserBetController {
    constructor(@repository(UserRepository) protected userRepository: UserRepository) {}

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.BETS.VIEW_ALL_BETS)],
    })
    @get(API_ENDPOINTS.USERS.BETS.CRUD, {
        responses: {
            '200': {
                description: 'Array of User has many Bet',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Bet) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<Bet>,
    ): Promise<ICommonHttpResponse<Bet[]>> {
        return { data: await this.userRepository.bets(id).find(filter) };
    }

    // @post('/users/{id}/bets', {
    //     responses: {
    //         '200': {
    //             description: 'User model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Bet) } },
    //         },
    //     },
    // })
    // async create(
    //     @param.path.number('id') id: typeof User.prototype.id,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Bet, {
    //                     title: 'NewBetInUser',
    //                     exclude: ['id'],
    //                     optional: ['userId'],
    //                 }),
    //             },
    //         },
    //     })
    //     bet: Omit<Bet, 'id'>,
    // ): Promise<Bet> {
    //     return this.userRepository.bets(id).create(bet);
    // }

    // @patch('/users/{id}/bets', {
    //     responses: {
    //         '200': {
    //             description: 'User.Bet PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async patch(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Bet, { partial: true }),
    //             },
    //         },
    //     })
    //     bet: Partial<Bet>,
    //     @param.query.object('where', getWhereSchemaFor(Bet)) where?: Where<Bet>,
    // ): Promise<Count> {
    //     return this.userRepository.bets(id).patch(bet, where);
    // }

    // @del('/users/{id}/bets', {
    //     responses: {
    //         '200': {
    //             description: 'User.Bet DELETE success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async delete(
    //     @param.path.number('id') id: number,
    //     @param.query.object('where', getWhereSchemaFor(Bet)) where?: Where<Bet>,
    // ): Promise<Count> {
    //     return this.userRepository.bets(id).delete(where);
    // }
}
