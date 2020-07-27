import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Player } from '@src/models';
import { PlayerRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class PlayerController {
    constructor(
        @repository(PlayerRepository)
        public playerRepository: PlayerRepository,
    ) {}

    // @post(API_ENDPOINTS.PLAYERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Player model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Player) } },
    //         },
    //     },
    // })
    // async create(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Player, {
    //                     title: 'NewPlayer',
    //                     exclude: ['id'],
    //                 }),
    //             },
    //         },
    //     })
    //     player: Omit<Player, 'id'>,
    // ): Promise<Player> {
    //     return this.playerRepository.create(player);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.COUNT_PLAYERS)] })
    @get(API_ENDPOINTS.PLAYERS.COUNT, {
        responses: {
            '200': {
                description: 'Player model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(Player) where?: Where<Player>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.playerRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @get(API_ENDPOINTS.PLAYERS.CRUD, {
        responses: {
            '200': {
                description: 'Array of Player model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(Player, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(Player) filter?: Filter<Player>): Promise<ICommonHttpResponse<Player[]>> {
        return { data: await this.playerRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.PLAYERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Player PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Player, { partial: true }),
    //             },
    //         },
    //     })
    //     player: Player,
    //     @param.where(Player) where?: Where<Player>,
    // ): Promise<Count> {
    //     return this.playerRepository.updateAll(player, where);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ANY_PLAYER)] })
    @get(API_ENDPOINTS.PLAYERS.BY_ID, {
        responses: {
            '200': {
                description: 'Player model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Player, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(Player, { exclude: 'where' }) filter?: FilterExcludingWhere<Player>,
    ): Promise<ICommonHttpResponse<Player>> {
        return { data: await this.playerRepository.findById(id, filter) };
    }

    // @patch(API_ENDPOINTS.PLAYERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Player PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Player, { partial: true }),
    //             },
    //         },
    //     })
    //     player: Player,
    // ): Promise<void> {
    //     await this.playerRepository.updateById(id, player);
    // }

    // @put(API_ENDPOINTS.PLAYERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Player PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() player: Player): Promise<void> {
    //     await this.playerRepository.replaceById(id, player);
    // }

    // @del(API_ENDPOINTS.PLAYERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Player DELETE success',
    //         },
    //     },
    // })
    // async deleteById(@param.path.number('id') id: number): Promise<void> {
    //     await this.playerRepository.deleteById(id);
    // }
}
