import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { HttpErrors, post, requestBody } from '@loopback/rest';
import { LeagueService } from '@src/services/league.service';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import {
    ILeagueImportRequestEspn,
    ILeagueImportRequestYahoo,
    ILeaguesFetchRequestYahoo,
    ILeagueFetchRequestEspn,
} from '@src/utils/interfaces/league-import.interface';
import { COMMON_MESSAGES, LEAGUE_IMPORT_MESSAGES } from '@src/utils/messages';
import { FETCH_LEAGUE_VALIDATOR } from '@src/utils/validators/league-import.validators';
// import {Client} from 'espn-fantasy-football-api/node';
import { isEmpty } from 'lodash';
import Schema from 'validate';
const { Client } = require('espn-fantasy-football-api/node-dev');
const YahooFantasy = require('yahoo-fantasy');

export class LeagueImportController {
    constructor(@service() private leagueService: LeagueService) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE_IMPORT.FETCH_YAHOO_LEAGUES, {
        responses: {
            '200': {
                description: 'Fetch Leagues from Yahoo.',
            },
        },
    })
    async fetchYahooLeagues(
        @requestBody()
        body: Partial<ILeaguesFetchRequestYahoo>,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            code: FETCH_LEAGUE_VALIDATOR.code,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        try {
            const tokenResponse = await this.leagueService.fetchYahooTokens(body.code);
            const { access_token, refresh_token } = tokenResponse.data;
            const yf = new YahooFantasy(process.env.YAHOO_APPLICATION_KEY, process.env.YAHOO_SECRET_KEY);
            yf.setUserToken(access_token);
            yf.setRefreshToken(refresh_token);

            const gameLeagues = await yf.user.game_leagues('nfl');
            const nfl = gameLeagues.games.find((game: any) => game.code === 'nfl');
            const yahooleaguesList = nfl ? nfl.leagues : [];
            let yahooleagues: any = [];

            yahooleaguesList.map((list: any) => {
                return list.map((league: any) => {
                    yahooleagues.push(league);
                });
            });

            const leagues = await Promise.all(
                yahooleagues.map(async (leagueMeta: any) => {
                    const teams = await yf.league.teams(leagueMeta.league_key);
                    const settings = await yf.league.settings(leagueMeta.league_key);

                    return { ...leagueMeta, teams: teams.teams, settings: settings.settings };
                }),
            );

            const tokens = {
                accessToken: access_token,
                refreshToken: refresh_token,
            };

            return {
                message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
                data: {
                    tokens: tokens,
                    leagues: leagues,
                },
            };
        } catch (error) {
            if (error.response) {
                console.log(
                    '🚀 ~ file: league-import.controller.ts ~ line 98 ~ LeagueImportController ~ error',
                    error.response.data,
                );
            }
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.FETCH_FAILED_YAHOO);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE_IMPORT.FETCH_ESPN_LEAGUES, {
        responses: {
            '200': {
                description: 'Fetch Leagues from Espn.',
            },
        },
    })
    async fetchESPNLeagues(
        @requestBody()
        body: Partial<ILeagueFetchRequestEspn>,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            espnS2: FETCH_LEAGUE_VALIDATOR.espnS2,
            swid: FETCH_LEAGUE_VALIDATOR.swid,
        };
        const { espnS2, swid } = body;
        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        try {
            const gameData = await this.leagueService.fetchESPNAccount(espnS2 || '', swid || '');

            const { preferences } = gameData.data;
            const leagues = await Promise.all(
                preferences.map(async (data: any) => {
                    const { id } = data;
                    const meta = id.split(':');
                    const leagueId = meta[1];
                    const seasonId = meta[3];
                    const scoringPeriodId = meta[2];
                    const leagueName = data.metaData.entry.groups[0].groupName;
                    const logoURL = data.metaData.entry.logoUrl;
                    const scoringType = data.metaData.entry.entryMetadata.scoringTypeId;

                    const teams = await this.leagueService.fetchESPNLeagueTeams(espnS2 || '', swid || '', leagueId);

                    return {
                        id: leagueId,
                        name: leagueName,
                        seasonId: seasonId,
                        scoringPeriodId: scoringPeriodId,
                        logoURL: logoURL,
                        scoringType: scoringType,
                        teams: teams,
                    };
                }),
            );

            return {
                message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
                data: {
                    leagues: leagues,
                    gameData: gameData.data,
                },
            };
        } catch (error) {
            if (error.response) {
                console.log(
                    '🚀 ~ file: league-import.controller.ts ~ line 98 ~ LeagueImportController ~ error',
                    error.response.data,
                );
            }
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.FETCH_FAILED_ESPN);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE_IMPORT.FETCH_ESPN, {
        responses: {
            '200': {
                description: 'Fetch League from ESPN.',
            },
        },
    })
    async fetchEspn(
        @requestBody()
        body: Partial<ILeagueImportRequestEspn>,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            leagueId: FETCH_LEAGUE_VALIDATOR.leagueId,
            espnS2: FETCH_LEAGUE_VALIDATOR.espnS2,
            swid: FETCH_LEAGUE_VALIDATOR.swid,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        let league = null;

        const leagueObject = { leagueId: body.leagueId };
        const espnClient = new Client(leagueObject);

        espnClient.setCookies({ espnS2: body.espnS2, SWID: body.swid });
        const options = { seasonId: 2021, scoringPeriodId: 13 };

        try {
            const leagueInfo = await espnClient.getTeamsAtWeek(options);
            league = leagueInfo;
        } catch (e) {
            console.log(e);
        }

        return {
            message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
            data: {
                league: league,
            },
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE_IMPORT.FETCH_YAHOO, {
        responses: {
            '200': {
                description: 'Fetch League from Yahoo.',
            },
        },
    })
    async fetchYahoo(
        @requestBody()
        body: Partial<ILeagueImportRequestYahoo>,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            leagueKey: FETCH_LEAGUE_VALIDATOR.leagueKey,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        let league = null;

        const yf = new YahooFantasy(process.env.YAHOO_APPLICATION_KEY, process.env.YAHOO_SECRET_KEY);

        // yf.auth();

        await yf.league.teams(body.leagueKey, function cb(err: object, data: object) {
            console.log(data);
            league = data;
            if (err) {
                console.log(err);
                throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.FETCH_FAILED_YAHOO);
            }
        });

        return {
            message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
            data: {
                league: league,
            },
        };
    }
}
