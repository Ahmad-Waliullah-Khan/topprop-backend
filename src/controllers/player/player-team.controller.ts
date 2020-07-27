import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Player, Team } from '@src/models';
import { PlayerRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class PlayerTeamController {
    constructor(
        @repository(PlayerRepository)
        public playerRepository: PlayerRepository,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TEAMS.VIEW_ANY_TEAM)] })
    @get(API_ENDPOINTS.PLAYERS.TEAM, {
        responses: {
            '200': {
                description: 'Team belonging to Player',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Team) },
                    },
                },
            },
        },
    })
    async getTeam(@param.path.number('id') id: typeof Player.prototype.id): Promise<ICommonHttpResponse<Team>> {
        return { data: await this.playerRepository.team(id) };
    }
}
