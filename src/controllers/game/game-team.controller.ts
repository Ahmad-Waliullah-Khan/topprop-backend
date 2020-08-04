import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Game, Team } from '@src/models';
import { GameRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';

export class GameTeamController {
    constructor(
        @repository(GameRepository)
        public gameRepository: GameRepository,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TEAMS.VIEW_ANY_TEAM)] })
    @get(API_ENDPOINTS.GAMES.TEAMS.HOME, {
        responses: {
            '200': {
                description: 'Team belonging to Game',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Team) },
                    },
                },
            },
        },
    })
    async getHomeTeam(@param.path.number('id') id: typeof Game.prototype.id): Promise<Team> {
        return this.gameRepository.homeTeam(id);
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TEAMS.VIEW_ANY_TEAM)] })
    @get(API_ENDPOINTS.GAMES.TEAMS.VISITOR, {
        responses: {
            '200': {
                description: 'Team belonging to Game',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Team) },
                    },
                },
            },
        },
    })
    async getVisitorTeam(@param.path.number('id') id: typeof Game.prototype.id): Promise<Team> {
        return this.gameRepository.visitorTeam(id);
    }
}
