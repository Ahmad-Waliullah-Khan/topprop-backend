import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Team } from '@src/models';
import { TeamRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class TeamController {
    constructor(
        @repository(TeamRepository)
        public teamRepository: TeamRepository,
    ) {}

    // @post(API_ENDPOINTS.TEAMS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Team model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Team) } },
    //         },
    //     },
    // })
    // async create(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Team, {
    //                     title: 'NewTeam',
    //                     exclude: ['id'],
    //                 }),
    //             },
    //         },
    //     })
    //     team: Omit<Team, 'id'>,
    // ): Promise<Team> {
    //     return this.teamRepository.create(team);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TEAMS.COUNT_TEAMS)] })
    @get(API_ENDPOINTS.TEAMS.COUNT, {
        responses: {
            '200': {
                description: 'Team model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(Team) where?: Where<Team>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.teamRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TEAMS.VIEW_ALL_TEAMS)] })
    @get(API_ENDPOINTS.TEAMS.CRUD, {
        responses: {
            '200': {
                description: 'Array of Team model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(Team, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(Team) filter?: Filter<Team>): Promise<ICommonHttpResponse<Team[]>> {
        return { data: await this.teamRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.TEAMS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Team PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Team, { partial: true }),
    //             },
    //         },
    //     })
    //     team: Team,
    //     @param.where(Team) where?: Where<Team>,
    // ): Promise<Count> {
    //     return this.teamRepository.updateAll(team, where);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TEAMS.VIEW_ANY_TEAM)] })
    @get(API_ENDPOINTS.TEAMS.BY_ID, {
        responses: {
            '200': {
                description: 'Team model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Team, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(Team, { exclude: 'where' }) filter?: FilterExcludingWhere<Team>,
    ): Promise<ICommonHttpResponse<Team>> {
        return { data: await this.teamRepository.findById(id, filter) };
    }

    // @patch('/teams/{id}', {
    //     responses: {
    //         '204': {
    //             description: 'Team PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Team, { partial: true }),
    //             },
    //         },
    //     })
    //     team: Team,
    // ): Promise<void> {
    //     await this.teamRepository.updateById(id, team);
    // }

    // @put('/teams/{id}', {
    //     responses: {
    //         '204': {
    //             description: 'Team PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() team: Team): Promise<void> {
    //     await this.teamRepository.replaceById(id, team);
    // }

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TEAMS)] })
    // @del('/teams/{id}', {
    //     responses: {
    //         '204': {
    //             description: 'Team DELETE success',
    //         },
    //     },
    // })
    // async deleteById(@param.path.number('id') id: number): Promise<void> {
    //     await this.teamRepository.deleteById(id);
    // }
}
