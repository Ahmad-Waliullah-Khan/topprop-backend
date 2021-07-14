import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {getModelSchemaRef, HttpErrors, post, requestBody} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {League} from '@src/models';
import {LeagueContestRepository, LeagueRepository, PlayerRepository, PlayerResultRepository, UserRepository} from '@src/repositories';
import {LeagueService, UserService} from '@src/services';
import {
    API_ENDPOINTS, PERMISSIONS
} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {
    ICommonHttpResponse,
    ICustomUserProfile
} from '@src/utils/interfaces';
import {ILeagueImportRequest} from '@src/utils/interfaces/league.interface';
import {COMMON_MESSAGES, LEAGUE_MESSAGES} from '@src/utils/messages';
import {FETCH_LEAGUE_VALIDATORS} from '@src/utils/validators';
import {isEmpty} from 'lodash';
import Schema from 'validate';

export class LeagueImportController {
    constructor(
        @repository(PlayerRepository)
        public playerRepository: PlayerRepository,
        @repository(PlayerResultRepository)
        public playerResultRepository: PlayerResultRepository,
        @repository(UserRepository)
        public userRepository: UserRepository,
        @repository(LeagueRepository)
        public leagueRepository: LeagueRepository,
        @repository(LeagueContestRepository)
        public leagueContestRepository: LeagueContestRepository,

        @service() private userService: UserService,
        @service() private leagueService: LeagueService,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.LEAGUE.VIEW_ALL_LEAGUES)] })
    @post(API_ENDPOINTS.LEAGUE.LEAGUE_IMPORT.CRUD, {
        responses: {
            '200': {
                description: 'League model instance',
                content: {
                    'application/json': {
                        schema: {
                            message: { type: 'string' },
                            data: {
                                myContests: { type: 'array', items: getModelSchemaRef(League) },
                                contests: { type: 'array', items: getModelSchemaRef(League) },
                            },
                        },
                    },
                },
            },
        },
    })
    async fetch(
        @requestBody()
        body: Partial<ILeagueImportRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            source: FETCH_LEAGUE_VALIDATORS.importSource,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        let leagueInfo = null;

        if ( body.source === 'ESPN' ) {
            leagueInfo = LeagueService.fetchESPNLeague(body.espnS2, body.swid)
        }

        return {
            message: LEAGUE_MESSAGES.FETCH_SUCCESS,
            data: {
                league: leagueInfo,
            },
        };
    }
}
