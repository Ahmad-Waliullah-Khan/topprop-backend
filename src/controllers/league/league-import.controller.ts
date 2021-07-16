import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {service} from '@loopback/core';
import {HttpErrors, post, requestBody} from '@loopback/rest';
import {LeagueService} from '@src/services/league.service';
import {
    API_ENDPOINTS,
    PERMISSIONS
} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {
    ICommonHttpResponse
} from '@src/utils/interfaces';
import {ILeagueImportRequest} from '@src/utils/interfaces/league-import.interface';
import {COMMON_MESSAGES, LEAGUE_IMPORT_MESSAGES} from '@src/utils/messages';
import {FETCH_LEAGUE_VALIDATOR} from '@src/utils/validators/league-import.validators';
// import {Client} from 'espn-fantasy-football-api/node';
import {isEmpty} from 'lodash';
import Schema from 'validate';
const { Client } = require('espn-fantasy-football-api/node-dev');

export class LeagueImportController {
    constructor(
        @service() private leagueService: LeagueService,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE_IMPORT.FETCH, {
        responses: {
            '200': {
                description: 'Fetch League.',
            },
        },
    })
    async fetch(
        @requestBody()
        body: Partial<ILeagueImportRequest>,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            source: FETCH_LEAGUE_VALIDATOR.source,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        let league = null;

        const options = {seasonId: 2021, scoringPeriodId: 1 };

        if ( body.source === 'ESPN' ) {
            if(!body.espnS2 || body.espnS2 == "") {
                throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.INVALID_ESPNS2);
            }
            if(!body.swid || body.swid == "") {
                throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.INVALID_SWID);
            }
            const espnClient = new Client ();
            espnClient.setCookies({espnS2: body.espnS2, SWID: body.swid});
            const leagueInfo = await espnClient.getTeamsAtWeek(options)

            console.log('...............', leagueInfo);
            league =  JSON.parse(leagueInfo);

        } else if ( body.source === 'YAHOO' ) {
            // fetch yahoo league
        } else {
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.INVALID_SOURCE);
        }

        return {
            message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
            data: {
                league: league,
            },
        };
    }
}
