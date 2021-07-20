import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId} from '@loopback/security';
import {League, Team} from '@src/models';
import {LeagueRepository, PlayerRepository, RosterRepository, ScoringTypeRepository, TeamRepository} from '@src/repositories';
import {LeagueService} from '@src/services/league.service';
import {API_ENDPOINTS, PERMISSIONS} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse, ICustomUserProfile} from '@src/utils/interfaces';
import {
    ILeagueFetchRequestEspn,
    ILeagueImportRequestEspn,
    ILeagueImportRequestYahoo,
    ILeaguesFetchRequestYahoo
} from '@src/utils/interfaces/league-import.interface';
import {COMMON_MESSAGES, LEAGUE_IMPORT_MESSAGES} from '@src/utils/messages';
import {FETCH_LEAGUE_VALIDATOR} from '@src/utils/validators/league-import.validators';
// import {Client} from 'espn-fantasy-football-api/node';
import {isEmpty} from 'lodash';
import Schema from 'validate';
const { Client } = require('espn-fantasy-football-api/node-dev');
const YahooFantasy = require('yahoo-fantasy');

export class LeagueImportController {
    constructor(
        @repository(LeagueRepository)
        public leagueRepository: LeagueRepository,
        @repository(TeamRepository)
        public teamRepository: TeamRepository,
        @repository(ScoringTypeRepository)
        public scoringTypeRepository: ScoringTypeRepository,
        @repository(PlayerRepository)
        public playerRepository: PlayerRepository,
        @repository(RosterRepository)
        public rosterRepository: RosterRepository,

        @service() private leagueService: LeagueService
    ) {}

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
            const yahooleagues: any = [];

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
            if(error.response){
                console.log("🚀 ~ file: league-import.controller.ts ~ line 98 ~ LeagueImportController ~ error", error.response.data)
            }
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.FETCH_FAILED_YAHOO);
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
        body: Partial<ILeagueFetchRequestEspn>,
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
            throw new HttpErrors.BadRequest(
                LEAGUE_IMPORT_MESSAGES.FETCH_FAILED
            );
        }

        return {
            message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
            data: {
                league: league,
            },
        };
    }

    @authenticate('jwt')
    @authorize({voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)]})
    @post(API_ENDPOINTS.LEAGUE_IMPORT.IMPORT_LEAGUE_YAHOO, {
        responses: {
            '200': {
                description: 'Import League from Yahoo.',
            },
        },
    })
    async importLeagueYahoo(
        @requestBody()
        body: Partial<ILeagueImportRequestYahoo>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!body.userId) body.userId = +currentUser[securityId];

        const validationSchema = {
            leagueKey: FETCH_LEAGUE_VALIDATOR.leagueKey,
            // name: FETCH_LEAGUE_VALIDATOR.name,
            // teamIds: FETCH_LEAGUE_VALIDATOR.teamIds,
            scoringTypeId: FETCH_LEAGUE_VALIDATOR.scoringTypeId,
            accessToken: FETCH_LEAGUE_VALIDATOR.accessToken,
            refreshToken: FETCH_LEAGUE_VALIDATOR.refreshToken,
        };

        const validation = new Schema(validationSchema, {strip: true});
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const yf = new YahooFantasy(
            process.env.YAHOO_APPLICATION_KEY,
            process.env.YAHOO_SECRET_KEY,
        );
        yf.setUserToken(body.accessToken);
        yf.setRefreshToken(body.refreshToken);

        //TODO:
        //. check for duplicate import
        //. Save the leagues data in league table.
        //. loop through league data to get the team ids
        //. loop through the teams to:
        //. get the roster for each team
        //. map the roster data against top-prop player data
        //. if the query returns null then throw 400 error
        //. loop through team array again to:
        //. insert the team id in the relevant player row in players table.
        //. Save the team data (from yahoo) in topprop teams table.

        //Note: Run above database inserts in transaction
        //. Return the league data along with relations in response

        const league = await yf.league.meta(
            body.leagueKey,
            function cb(err: object, data: object) {
                console.log(data);
                if (err) {
                    console.log(err);
                    throw new HttpErrors.BadRequest(
                        LEAGUE_IMPORT_MESSAGES.IMPORT_FAILED
                    );
                }
                return data;
            });

        // CHECK FOR DUPLICATE IMPORT
        // const leagueFilter = {
        //     where: {
        //         remoteId: leagues.id,
        //     },
        // };
        // const existingLeague =  this.leagueRepository.find(leagueFilter);
        // console.log(existingLeague);

        // if(await this.leagueRepository.find(leagueFilter)) {
        //     throw new HttpErrors.BadRequest(
        //         LEAGUE_IMPORT_MESSAGES.DUPLICATE_IMPORT
        //     );
        // }


        const teams = await yf.league.teams(
            body.leagueKey,
            function cb(err: object, data: object) {
                console.log(data);
                if (err) {
                    console.log(err);
                    throw new HttpErrors.BadRequest(
                        LEAGUE_IMPORT_MESSAGES.IMPORT_FAILED
                    );
                }
                return data;
            }
        );

        const leagueData = new League();

        leagueData.name = league.name;
        leagueData.remoteId = league.league_id; //format:{GameKey}.1.{leagueId}
        leagueData.userId = body.userId;
        leagueData.scoringId = Number(body.scoringTypeId); //1=halfppr, 2=fullppr, 3=noppr
        leagueData.sourceId = 2; // in source table: 1 = espn, 2 = yahoo
        leagueData.syncStatus = "success";

        const createdLeague = await this.leagueRepository.create(leagueData);

        teams.teams.forEach(async (team:any) => {
            const teamData = new Team();

            teamData.name = team.name;
            teamData.logoUrl = team.team_logos[0].url;
            teamData.wordMarkUrl = team.url;
            teamData.privateLeagueId = league.league_id;
            teamData.userId = body.userId = +currentUser[securityId];

            await this.teamRepository.create(teamData);

        });

        // const players = await yf.team.roster(
        //     "406.l.171449.t.1", //loop through the team array to get the roster for the team id
        //     function cb(err: object, data: object) {
        //         console.log(data);
        //         if (err) {
        //             console.log(err);
        //             throw new HttpErrors.BadRequest(
        //                 LEAGUE_IMPORT_MESSAGES.IMPORT_FAILED
        //             );
        //         }
        //         return data;
        //     }
        // );

        // const leagueResponseFilter = {
        //     where: {
        //         remoteId: body.leagueKey,
        //     },
        //     include: ['user', 'teams', 'scoringTypes', 'importSources'],
        // };
        // const leagueResponse =  this.leagueRepository.find(leagueResponseFilter);

        return {
            message: LEAGUE_IMPORT_MESSAGES.IMPORT_SUCCESS,
            data: {
                league: league,
                teams: teams,
            },
        };
    }

    @authenticate('jwt')
    @authorize({voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)]})
    @post(API_ENDPOINTS.LEAGUE_IMPORT.IMPORT_LEAGUE_ESPN, {
        responses: {
            '200': {
                description: 'Import League from ESPN.',
            },
        },
    })
    async importLeagueEspn(
        @requestBody()
        body: Partial<ILeagueImportRequestEspn>,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            leagueId: FETCH_LEAGUE_VALIDATOR.leagueId,
            name: FETCH_LEAGUE_VALIDATOR.name,
            espnS2: FETCH_LEAGUE_VALIDATOR.espnS2,
            swid: FETCH_LEAGUE_VALIDATOR.swid,
            scoringType: FETCH_LEAGUE_VALIDATOR.scoringType,
        };

        const validation = new Schema(validationSchema, {strip: true});
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        let league = null;

        const leagueObject = {leagueId: body.leagueId};
        const espnClient = new Client(leagueObject);

        espnClient.setCookies({espnS2: body.espnS2, SWID: body.swid});
        const options = {seasonId: 2021, scoringPeriodId: 13}; //TODO: get season and scoring period from request

        try {
            const leagueInfo = await espnClient.getTeamsAtWeek(options)
            league = leagueInfo;
        } catch (e) {
            console.log(e);
            throw new HttpErrors.BadRequest(
                LEAGUE_IMPORT_MESSAGES.FETCH_FAILED
            );
        }

        //TODO:
        //update interface
        //map league data
        //map team data
        //get current user id
        //get player roster data from espn
        //map player data with our player table data
        //create league, team, player table entry
        //return league data with relation

        const leagueData = new League();

        return {
            message: LEAGUE_IMPORT_MESSAGES.IMPORT_SUCCESS,
            data: {
                league: league,
            },
        };
    }

}
