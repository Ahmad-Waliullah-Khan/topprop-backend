import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import { IsolationLevel, repository } from '@loopback/repository';
import { HttpErrors, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { League, Member, Roster, Team } from '@src/models';
import {
    LeagueRepository,
    MemberRepository,
    PlayerRepository,
    RosterRepository,
    ScoringTypeRepository,
    TeamRepository,
    UserRepository,
} from '@src/repositories';
import { UserService } from '@src/services';
import { LeagueService } from '@src/services/league.service';
import { API_ENDPOINTS, EMAIL_TEMPLATES, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import {
    ICommonHttpResponse,
    ICustomUserProfile,
    ILeagueFetchRequestEspn,
    ILeagueImportRequestEspn,
    ILeagueImportRequestYahoo,
    ILeaguesFetchRequestYahoo,
    ILeagueSyncRequestEspn,
    ILeagueSyncRequestYahoo,
} from '@src/utils/interfaces';
import { COMMON_MESSAGES, LEAGUE_IMPORT_MESSAGES } from '@src/utils/messages';
import { FETCH_LEAGUE_VALIDATOR, IMPORT_LEAGUE_VALIDATOR } from '@src/utils/validators/league-import.validators';
// import {Client} from 'espn-fantasy-football-api/node';
import { isEmpty } from 'lodash';
import Schema from 'validate';
import {
    ESPN_LINEUP_SLOT_MAPPING,
    ESPN_POSITION_MAPPING,
    ESPN_BLOCKED_LINEUPID_LIST,
    YAHOO_BLOCKED_POSITION_LIST,
} from '../../utils/constants/league.constants';
import logger from '../../utils/logger';
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
        @service() private userService: UserService,
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
                preferences
                    .filter((data: any) => {
                        const { id } = data;
                        const meta = id.split(':');
                        return meta.length == 4;
                    })
                    .filter((data: any) => {
                        const leagueType = data.metaData.entry.abbrev;
                        return leagueType === 'FFL';
                    })
                    .map(async (data: any) => {
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
    async importESPNLeague(
        @requestBody()
        body: Partial<ILeagueImportRequestEspn>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const userId = +currentUser[securityId];

        const validationSchema = {
            leagueId: IMPORT_LEAGUE_VALIDATOR.espnleagueId,
            espnS2: IMPORT_LEAGUE_VALIDATOR.espnS2,
            swid: IMPORT_LEAGUE_VALIDATOR.swid,
            scoringTypeId: IMPORT_LEAGUE_VALIDATOR.scoringTypeId,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const { espnS2, swid, leagueId, scoringTypeId } = body;

        const league = await this.leagueRepository.find({
            where: {
                remoteId: leagueId,
            },
        });

        if (league.length > 0) throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.LEAGUE_EXISTS);

        // @ts-ignore
        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.READ_COMMITTED);

        try {
            const league = await this.leagueService.fetchESPNLeague(espnS2 || '', swid || '', leagueId || '');

            const localPlayers = await this.playerRepository.find();

            const leagueData = new League();
            leagueData.importSourceId = 1; // in source table: 1 = espn, 2 = yahoo
            leagueData.remoteId = leagueId || ''; //format:{GameKey}.1.{leagueId}
            leagueData.name = league.name;
            leagueData.scoringTypeId = Number(scoringTypeId); //1=halfppr, 2=fullppr, 3=noppr
            leagueData.syncStatus = 'success';
            leagueData.lastSyncTime = new Date();
            leagueData.userId = userId;

            const createdLeague = await this.leagueRepository.create(leagueData, { transaction });

            const teamsInfo = await this.leagueService.fetchESPNLeagueTeams(espnS2 || '', swid || '', leagueId || '');

            const teamIds = teamsInfo.map((team: any) => team.id);

            const leaguePromise = await this.leagueService.fetchESPNLeagueTeamsByIds(
                espnS2 || '',
                swid || '',
                teamIds,
                league.seasonId,
                leagueId || '',
            );

            const leagueInfo = leaguePromise.data;

            const notFoundPlayers: any[] = [];

            const { teams } = leagueInfo;
            await Promise.all(
                teams.map(async (team: any) => {
                    const teamData = new Team();

                    teamData.name = `${team.location} ${team.nickname}`;
                    teamData.remoteId = `${leagueId}-${team.id}`;
                    teamData.logoUrl = team.logo;
                    teamData.wordMarkUrl = team.abbrev;
                    teamData.leagueId = createdLeague.id;
                    const createdTeam = await this.teamRepository.create(teamData, { transaction });

                    const roster = team?.roster ? team.roster.entries : [];

                    const sortedRoster = roster.sort((a: any, b: any) => {
                        return a.lineupSlotId - b.lineupSlotId;
                    });

                    await Promise.all(
                        sortedRoster.map(async (remotePlayer: any) => {
                            if (!ESPN_BLOCKED_LINEUPID_LIST.includes(remotePlayer.lineupSlotId)) {
                                const normalisedRemotePlayer = {
                                    name: {
                                        first: remotePlayer?.playerPoolEntry?.player?.firstName,
                                        last: remotePlayer?.playerPoolEntry?.player?.lastName,
                                    },
                                    player_id: remotePlayer?.playerPoolEntry?.player.id,
                                    display_position:
                                        ESPN_POSITION_MAPPING[remotePlayer?.playerPoolEntry?.player.defaultPositionId],
                                    team_position: ESPN_LINEUP_SLOT_MAPPING[remotePlayer?.lineupSlotId],
                                };

                                const foundPlayer = await this.leagueService.findPlayer(
                                    normalisedRemotePlayer,
                                    localPlayers,
                                    normalisedRemotePlayer.team_position,
                                    'espn',
                                );

                                if (!foundPlayer) {
                                    notFoundPlayers.push(remotePlayer);
                                    const user = await this.userRepository.findById(userId);
                                    await this.userService.sendEmail(
                                        user,
                                        EMAIL_TEMPLATES.LEAGUE_PLAYER_NOT_FOUND,
                                        {
                                            user: user,
                                            text: {
                                                title: `Player Not Found.`,
                                                subtitle: `League player ${remotePlayer?.name?.first} ${remotePlayer?.name?.last} from "${team.name}" not found in TopProp system.`,
                                            },
                                        },
                                        process.env.SUPPORT_EMAIL_ADDRESS,
                                    );
                                    // throw new HttpErrors.BadRequest(
                                    //     `${normalisedRemotePlayer.name.first} ${normalisedRemotePlayer.name.last} from "${createdTeam.name}" does not exist in our system. Our team is working on it. We apologies for the inconvenience`,
                                    // );
                                } else {
                                    const rosterData = new Roster();
                                    rosterData.teamId = createdTeam.id;
                                    rosterData.playerId = foundPlayer.id;
                                    rosterData.displayPosition = normalisedRemotePlayer.display_position || '';
                                    await this.rosterRepository.create(rosterData, { transaction });

                                    if (!remotePlayer.display_position) {
                                        logger.error(
                                            `${foundPlayer.fullName} does not have a display position when returned from ESPN`,
                                        );
                                    }
                                }
                            }

                            return false;
                        }),
                    );
                }),
            );

            // console.log(
            //     '🚀 ~ file: league-import.controller.ts ~ line 368 ~ LeagueImportController ~ notFoundPlayers',
            //     notFoundPlayers,
            // );

            const userData = await this.userRepository.findById(userId);

            if (userData) {
                userData.espns2 = espnS2 || null;
                userData.espnswid = swid || null;

                await this.userRepository.save(userData, { transaction });
            }

            const memberData = new Member();
            memberData.leagueId = createdLeague.id;
            memberData.userId = createdLeague.userId;

            await this.memberRepository.create(memberData, { transaction });

            await transaction.commit();

            const newLeague = await this.leagueRepository.findOne({
                where: {
                    remoteId: leagueId,
                },
                include: ['teams'],
            });

            const user = await this.userRepository.findById(userId);

            await this.userService.sendEmail(
                user,
                EMAIL_TEMPLATES.LEAGUE_IMPORT,
                {
                    user: user,
                    text: {
                        title: `${league.name} has been imported.`,
                        subtitle: `The league: ${league.name} from ESPN Leagues has been imported successfully.`,
                    },
                },
                user.email,
            );

            return {
                message: LEAGUE_IMPORT_MESSAGES.IMPORT_SUCCESS_ESPN,
                data: {
                    league: newLeague,
                },
            };
        } catch (error) {
            console.log('🚀 ~ file: league-import.controller.ts ~ line 360 ~ LeagueImportController ~ error', error);
            logger.error(error.message);
            await transaction.rollback();
            if (error.name === 'BadRequestError') {
                throw new HttpErrors.BadRequest(error.message);
            }
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.IMPORT_FAILED_ESPN);
        }
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
            scoringTypeId: IMPORT_LEAGUE_VALIDATOR.scoringTypeId,
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
        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.READ_COMMITTED);

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

            const userData = await this.userRepository.findById(userId);
            const user = userData;

            const createdLeague = await this.leagueRepository.create(leagueData, { transaction });

            const teams = await yf.league.teams(createdLeague.remoteId);
            await Promise.all(
                teams.teams.map(async (team: any) => {
                    const teamData = new Team();

                    teamData.name = team.name;
                    teamData.remoteId = team.team_key;
                    teamData.logoUrl = team.team_logos[0].url;
                    teamData.wordMarkUrl = team.url;
                    teamData.leagueId = createdLeague.id;
                    const createdTeam = await this.teamRepository.create(teamData, { transaction });

                    const roster = await yf.team.roster(createdTeam.remoteId);

                    await Promise.all(
                        roster.roster.map(async (remotePlayer: any) => {
                            if (!YAHOO_BLOCKED_POSITION_LIST.includes(remotePlayer.selected_position)) {
                                const foundPlayer = await this.leagueService.findPlayer(
                                    remotePlayer,
                                    localPlayers,
                                    remotePlayer.selected_position,
                                    'yahoo',
                                );
                                if (!foundPlayer) {
                                    await this.userService.sendEmail(
                                        user,
                                        EMAIL_TEMPLATES.LEAGUE_PLAYER_NOT_FOUND,
                                        {
                                            user: user,
                                            text: {
                                                title: `Player Not Found.`,
                                                subtitle: `League player ${remotePlayer?.name?.first} ${remotePlayer?.name?.last} from "${team.name}" not found in TopProp system.`,
                                            },
                                        },
                                        process.env.SUPPORT_EMAIL_ADDRESS,
                                    );
                                    throw new HttpErrors.BadRequest(
                                        `${remotePlayer?.name?.first} ${remotePlayer?.name?.last} from "${team.name}" does not exist in our system. Our team is working on it. We apologies for the inconvenience`,
                                    );
                                }
                                const rosterData = new Roster();
                                rosterData.teamId = createdTeam.id;
                                rosterData.playerId = foundPlayer.id;
                                rosterData.displayPosition = remotePlayer.display_position || '';
                                await this.rosterRepository.create(rosterData, { transaction });

                                if (!remotePlayer.display_position) {
                                    logger.error(
                                        `${foundPlayer.fullName} does not have a display position when returned from Yahoo`,
                                    );
                                }
                            }

                            return false;
                        }),
                    );
                }),
            );

            if (userData) {
                userData.yahooRefreshToken = refreshToken || null;
                userData.yahooAccessToken = accessToken || null;

                await this.userRepository.save(userData, { transaction });
            }

            const memberData = new Member();
            memberData.leagueId = createdLeague.id;
            memberData.userId = createdLeague.userId;

            await this.memberRepository.create(memberData, { transaction });

            // await transaction.rollback();
            await transaction.commit();

            this.userService.sendEmail(
                user,
                EMAIL_TEMPLATES.LEAGUE_IMPORT,
                {
                    user: user,
                    text: {
                        title: `${league.name} has been imported.`,
                        subtitle: `The league: ${league.name} from YAHOO Leagues has been imported successfully.`,
                    },
                },
                user.email,
            );

            const newLeague = await this.leagueRepository.findOne({
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
            logger.error(error.message);
            await transaction.rollback();
            if (error.name === 'BadRequestError') {
                throw new HttpErrors.BadRequest(error.message);
            }
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.IMPORT_FAILED_YAHOO);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE_IMPORT.RESYNC_ESPN, {
        responses: {
            '200': {
                description: 'Resync League from ESPN.',
            },
        },
    })
    async resyncESPNLeague(
        @requestBody()
        body: Partial<ILeagueSyncRequestEspn>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);
        const userId = +currentUser[securityId];

        const validationSchema = {
            leagueId: IMPORT_LEAGUE_VALIDATOR.leagueId,
            espnS2: IMPORT_LEAGUE_VALIDATOR.espnS2,
            swid: IMPORT_LEAGUE_VALIDATOR.swid,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const { espnS2, swid, leagueId } = body;

        const league = await this.leagueRepository.findById(leagueId || 0);

        if (!league) throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.LEAGUE_DOES_NOT_EXIST);

        const userData = await this.userRepository.findById(userId);
        // @ts-ignore
        if (userId !== league.userId) throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.NOT_LEAGUE_ADMIN);
        // @ts-ignore

        try {
            if (userData) {
                userData.espns2 = espnS2 || null;
                userData.espnswid = swid || null;

                await this.userRepository.save(userData);
            }

            await this.leagueService.resyncESPN(league.id);

            const newLeague = await this.leagueRepository.find({
                where: {
                    id: leagueId,
                },
                include: ['teams'],
            });

            const user = await this.userRepository.findById(userId);

            return {
                message: LEAGUE_IMPORT_MESSAGES.SYNC_SUCCESS_ESPN,
                data: {
                    league: newLeague,
                },
            };
        } catch (error) {
            console.log('🚀 ~ file: league-import.controller.ts ~ line 360 ~ LeagueImportController ~ error', error);
            logger.error(error.message);
            if (error.name === 'BadRequestError') {
                throw new HttpErrors.BadRequest(error.message);
            }
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.SYNC_FAILED_ESPN);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE_IMPORT.RESYNC_YAHOO, {
        responses: {
            '200': {
                description: 'Resync League from Yahoo.',
            },
        },
    })
    async resyncYahooLeague(
        @requestBody()
        body: Partial<ILeagueSyncRequestYahoo>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);
        const userId = +currentUser[securityId];

        const validationSchema = {
            leagueId: IMPORT_LEAGUE_VALIDATOR.leagueId,
            code: IMPORT_LEAGUE_VALIDATOR.code,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const { code, leagueId } = body;

        const league = await this.leagueRepository.findById(leagueId || 0);

        if (!league) throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.LEAGUE_DOES_NOT_EXIST);

        const userData = await this.userRepository.findById(userId);

        if (userId !== league.userId) throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.NOT_LEAGUE_ADMIN);

        try {
            const tokenResponse = await this.leagueService.fetchYahooTokens(code);
            const { access_token, refresh_token } = tokenResponse.data;

            if (userData) {
                userData.yahooRefreshToken = refresh_token || null;
                userData.yahooAccessToken = access_token || null;

                await this.userRepository.save(userData);
            }

            await this.leagueService.resyncYahoo(league.id);

            const newLeague = await this.leagueRepository.find({
                where: {
                    id: leagueId,
                },
                include: ['teams'],
            });

            const user = await this.userRepository.findById(userId);

            return {
                message: LEAGUE_IMPORT_MESSAGES.SYNC_SUCCESS_YAHOO,
                data: {
                    league: newLeague,
                },
            };
        } catch (error) {
            console.log('🚀 ~ file: league-import.controller.ts ~ line 360 ~ LeagueImportController ~ error', error);
            logger.error(error.message);
            if (error.name === 'BadRequestError') {
                throw new HttpErrors.BadRequest(error.message);
            }
            throw new HttpErrors.BadRequest(LEAGUE_IMPORT_MESSAGES.SYNC_FAILED_YAHOO);
        }
    }
}
