import {authenticate} from '@loopback/authentication';
import {HttpErrors, post, requestBody} from '@loopback/rest';
// import {LeagueService, UserService} from '@src/services';
import {
    API_ENDPOINTS
} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {
    ICommonHttpResponse
} from '@src/utils/interfaces';
import {ILeagueImportRequest} from '@src/utils/interfaces/league-import.interface';
import {COMMON_MESSAGES, LEAGUE_IMPORT_MESSAGES} from '@src/utils/messages';
import {FETCH_LEAGUE_VALIDATOR} from '@src/utils/validators/league-import.validators';
import {isEmpty} from 'lodash';
import Schema from 'validate';

export class LeagueImportController {
    constructor(

    ) {}

    @authenticate('jwt')
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

        const leagueInfo = null;

        if ( body.source === 'ESPN' ) {
            // leagueInfo = LeagueService.fetchESPNLeague(body.espnS2, body.swid)
        }

        return {
            message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
            data: {
                league: leagueInfo,
            },
        };
    }
}
