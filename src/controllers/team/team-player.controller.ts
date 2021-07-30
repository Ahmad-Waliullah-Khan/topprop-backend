import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Player } from '@src/models';
import { TeamRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class TeamPlayerController {
    constructor(@repository(TeamRepository) protected teamRepository: TeamRepository) {}

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    // @get(API_ENDPOINTS.TEAMS.PLAYERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Array of Team has many Player',
    //             content: {
    //                 'application/json': {
    //                     schema: { type: 'array', items: getModelSchemaRef(Player) },
    //                 },
    //             },
    //         },
    //     },
    // })
    // async find(
    //     @param.path.number('id') id: number,
    //     @param.query.object('filter') filter?: Filter<Player>,
    // ): Promise<ICommonHttpResponse<Player[]>> {
    //     return { data: await this.teamRepository.find(filter) };
    // }

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    // @post(API_ENDPOINTS.TEAMS.PLAYERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Team model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Player) } },
    //         },
    //     },
    // })
    // async create(
    //     @param.path.number('id') id: typeof Team.prototype.id,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Player, {
    //                     title: 'NewPlayerInTeam',
    //                     exclude: ['id'],
    //                     optional: ['teamId'],
    //                 }),
    //             },
    //         },
    //     })
    //     player: Omit<Player, 'id'>,
    // ): Promise<ICommonHttpResponse<Player>> {
    //     return { data: await this.teamRepository.players(id).create(player) };
    // }

    // @patch(API_ENDPOINTS.TEAMS.PLAYERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Team.Player PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async patch(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Player, { partial: true }),
    //             },
    //         },
    //     })
    //     player: Partial<Player>,
    //     @param.query.object('where', getWhereSchemaFor(Player)) where?: Where<Player>,
    // ): Promise<Count> {
    //     return this.teamRepository.players(id).patch(player, where);
    // }

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.DELETE_ANY_PLAYER)] })
    // @del(API_ENDPOINTS.TEAMS.PLAYERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Team.Player DELETE success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async delete(
    //     @param.path.number('id') id: number,
    //     @param.query.object('where', getWhereSchemaFor(Player)) where?: Where<Player>,
    // ): Promise<ICommonHttpResponse<Count>> {
    //     return { data: await this.teamRepository.players(id).delete(where) };
    // }
}
