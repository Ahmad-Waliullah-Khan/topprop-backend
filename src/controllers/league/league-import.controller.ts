import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import { HttpErrors, post, requestBody } from '@loopback/rest';
import { repository, IsolationLevel, DefaultTransactionalRepository } from '@loopback/repository';
import { LeagueService } from '@src/services/league.service';
import { SecurityBindings, securityId } from '@loopback/security';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { League, Team, Roster, Member } from '@src/models';
import {
    ILeagueImportRequestEspn,
    ILeagueImportRequestYahoo,
    ILeaguesFetchRequestYahoo,
    ILeagueFetchRequestEspn,
    ICustomUserProfile,
} from '@src/utils/interfaces';
import {
    LeagueRepository,
    PlayerRepository,
    RosterRepository,
    ScoringTypeRepository,
    TeamRepository,
    UserRepository,
    MemberRepository,
} from '@src/repositories';
import { COMMON_MESSAGES, LEAGUE_IMPORT_MESSAGES } from '@src/utils/messages';
import { FETCH_LEAGUE_VALIDATOR, IMPORT_LEAGUE_VALIDATOR } from '@src/utils/validators/league-import.validators';
// import {Client} from 'espn-fantasy-football-api/node';
import { isEmpty } from 'lodash';
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
        @repository(UserRepository)
        public userRepository: UserRepository,
        @repository(MemberRepository)
        public memberRepository: MemberRepository,
        @service() private leagueService: LeagueService,
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
            console.log('🚀 ~ file: league-import.controller.ts ~ line 118 ~ LeagueImportController ~ error', error);

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
    @post(API_ENDPOINTS.LEAGUE_IMPORT.IMPORT_ESPN, {
        responses: {
            '200': {
                description: 'Import League from ESPN.',
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
    @post(API_ENDPOINTS.LEAGUE_IMPORT.IMPORT_YAHOO, {
        responses: {
            '200': {
                description: 'Import League from Yahoo.',
            },
        },
    })
    async importYahooLeague(
        @requestBody()
        body: Partial<ILeagueImportRequestYahoo>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const userId = +currentUser[securityId];

        const validationSchema = {
            leagueKey: IMPORT_LEAGUE_VALIDATOR.leagueKey,
            accessToken: IMPORT_LEAGUE_VALIDATOR.accessToken,
            refreshToken: IMPORT_LEAGUE_VALIDATOR.refreshToken,
            scoringTypeId: IMPORT_LEAGUE_VALIDATOR.leagueKey,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        // if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const { leagueKey, accessToken, refreshToken, scoringTypeId } = body;

        const yf = new YahooFantasy(process.env.YAHOO_APPLICATION_KEY, process.env.YAHOO_SECRET_KEY);
        yf.setUserToken(accessToken);
        yf.setRefreshToken(refreshToken);

        const league = await this.leagueRepository.find({
            where: {
                remoteId: leagueKey,
            },
        });

        if (league.length > 0) throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.LEAGUE_EXISTS);

        // @ts-ignore
        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.SERIALIZABLE);

        try {
            const localPlayers = await this.playerRepository.find();
            const league = await yf.league.meta(leagueKey);
            const leagueData = new League();

            leagueData.importSourceId = 2; // in source table: 1 = espn, 2 = yahoo
            leagueData.remoteId = league.league_key; //format:{GameKey}.1.{leagueId}
            leagueData.name = league.name;
            leagueData.scoringTypeId = Number(scoringTypeId); //1=halfppr, 2=fullppr, 3=noppr
            leagueData.syncStatus = 'success';
            leagueData.lastSyncTime = new Date();
            leagueData.userId = userId;

            const createdLeague = await this.leagueRepository.create(leagueData, { transaction });

            const teams = await yf.league.teams(createdLeague.remoteId);
            await Promise.all(
                teams.teams.map(async (team: any) => {
                    const teamData = new Team();

                    teamData.name = team.name;
                    teamData.remoteId = team.team_key;
                    teamData.logoUrl = team.team_logos[0].url;
                    teamData.wordMarkUrl = team.url;
                    teamData.userId = userId;
                    teamData.leagueId = createdLeague.id;
                    const createdTeam = await this.teamRepository.create(teamData, { transaction });

                    const roster = await yf.team.roster(createdTeam.remoteId);

                    await Promise.all(
                        roster.roster.map(async (remotePlayer: any) => {
                            const foundPlayer = await this.leagueService.findPlayer(remotePlayer, localPlayers);
                            const rosterData = new Roster();
                            rosterData.teamId = createdTeam.id;
                            rosterData.playerId = foundPlayer.id;
                            rosterData.displayPosition = remotePlayer.display_position;
                            await this.rosterRepository.create(rosterData, { transaction });
                            return false;
                        }),
                    );
                }),
            );

            const userData = await this.userRepository.findById(userId);

            if (userData) {
                userData.yahooRefreshToken = refreshToken || null;
                userData.yahooAccessToken = refreshToken || null;

                await this.userRepository.save(userData, { transaction });
            }

            const memberData = new Member();
            memberData.leagueId = createdLeague.id;
            memberData.userId = createdLeague.userId;

            await this.memberRepository.create(memberData, { transaction });

            await transaction.commit();

            const newLeague = await this.leagueRepository.find({
                where: {
                    remoteId: leagueKey,
                },
                include: ['teams'],
            });

            return {
                message: LEAGUE_IMPORT_MESSAGES.IMPORT_SUCCESS_YAHOO,
                data: {
                    league: newLeague,
                },
            };
        } catch (error) {
            console.log('🚀 ~ file: league-import.controller.ts ~ line 360 ~ LeagueImportController ~ error', error);
            await transaction.rollback();
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.IMPORT_FAILED_YAHOO);
        }
    }
}
