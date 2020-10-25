import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Game } from '@src/models';
import { GameRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class GameController {
    constructor(
        @repository(GameRepository)
        public gameRepository: GameRepository,
    ) {}

    // @post(API_ENDPOINTS.GAMES.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Game model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Game) } },
    //         },
    //     },
    // })
    // async create(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Game, {
    //                     title: 'NewGame',
    //                     exclude: ['id'],
    //                 }),
    //             },
    //         },
    //     })
    //     game: Omit<Game, 'id'>,
    // ): Promise<Game> {
    //     return this.gameRepository.create(game);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.GAMES.COUNT_GAMES)] })
    @get(API_ENDPOINTS.GAMES.COUNT, {
        responses: {
            '200': {
                description: 'Game model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(Game) where?: Where<Game>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.gameRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.GAMES.VIEW_ALL_GAMES)] })
    @get(API_ENDPOINTS.GAMES.CRUD, {
        responses: {
            '200': {
                description: 'Array of Game model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(Game, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(Game) filter?: Filter<Game>): Promise<ICommonHttpResponse<Game[]>> {
        return { data: await this.gameRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.GAMES.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Game PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Game, { partial: true }),
    //             },
    //         },
    //     })
    //     game: Game,
    //     @param.where(Game) where?: Where<Game>,
    // ): Promise<Count> {
    //     return this.gameRepository.updateAll(game, where);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.GAMES.VIEW_ANY_GAME)] })
    @get(API_ENDPOINTS.GAMES.BY_ID, {
        responses: {
            '200': {
                description: 'Game model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Game, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(Game, { exclude: 'where' }) filter?: FilterExcludingWhere<Game>,
    ): Promise<ICommonHttpResponse<Game>> {
        return { data: await this.gameRepository.findById(id, filter) };
    }

    // @patch(API_ENDPOINTS.GAMES.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Game PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Game, { partial: true }),
    //             },
    //         },
    //     })
    //     game: Game,
    // ): Promise<void> {
    //     await this.gameRepository.updateById(id, game);
    // }

    // @put(API_ENDPOINTS.GAMES.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Game PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() game: Game): Promise<void> {
    //     await this.gameRepository.replaceById(id, game);
    // }

    // @del(API_ENDPOINTS.GAMES.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Game DELETE success',
    //         },
    //     },
    // })
    // async deleteById(@param.path.number('id') id: number): Promise<void> {
    //     await this.gameRepository.deleteById(id);
    // }
}
