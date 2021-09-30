import { BindingScope, Getter, injectable, service } from '@loopback/core';
import { IsolationLevel, repository } from '@loopback/repository';
import { League, Roster, Team } from '@src/models';
import {
    InviteRepository,
    LeagueRepository,
    MemberRepository,
    PlayerRepository,
    RosterRepository,
    SpreadRepository,
    TeamRepository,
    UserRepository,
} from '@src/repositories';
import { EMAIL_TEMPLATES } from '@src/utils/constants';
import {
    ESPN_BLOCKED_LINEUPID_LIST,
    ESPN_LINEUP_SLOT_MAPPING,
    ESPN_POSITION_MAPPING,
    YAHOO_BLOCKED_POSITION_LIST,
} from '@src/utils/constants/league.constants';
import { MiscHelpers } from '@src/utils/helpers';
import axios from 'axios';
import chalk from 'chalk';
import moment from 'moment';
import logger from '../utils/logger';
import { UserService } from './user.service';
const { Client } = require('espn-fantasy-football-api/node');
const YahooFantasy = require('yahoo-fantasy');

@injectable({ scope: BindingScope.SINGLETON })
export class LeagueService {
    playerRepo: PlayerRepository;
    spreadRepo: SpreadRepository;
    leagueRepository: LeagueRepository;
    memberRepository: MemberRepository;
    teamRepository: TeamRepository;
    inviteRepository: InviteRepository;
    userRepository: UserRepository;
    rosterRepository: RosterRepository;

    constructor(
        @service() private userService: UserService,
        @repository.getter('PlayerRepository') private playerRepoGetter: Getter<PlayerRepository>,
        @repository.getter('SpreadRepository') private spreadRepoGetter: Getter<SpreadRepository>,
        @repository.getter('LeagueRepository') private leagueRepositoryGetter: Getter<LeagueRepository>,
        @repository.getter('MemberRepository') private memberRepositoryGetter: Getter<MemberRepository>,
        @repository.getter('TeamRepository') private teamRepositoryGetter: Getter<TeamRepository>,
        @repository.getter('InviteRepository') private inviteRepositoryGetter: Getter<InviteRepository>,
        @repository.getter('UserRepository') private userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('RosterRepository') private rosterRepositoryGetter: Getter<RosterRepository>,
    ) {
        (async () => {
            this.playerRepo = await this.playerRepoGetter();
            this.spreadRepo = await this.spreadRepoGetter();
            this.leagueRepository = await this.leagueRepositoryGetter();
            this.memberRepository = await this.memberRepositoryGetter();
            this.teamRepository = await this.teamRepositoryGetter();
            this.inviteRepository = await this.inviteRepositoryGetter();
            this.userRepository = await this.userRepositoryGetter();
            this.rosterRepository = await this.rosterRepositoryGetter();
        })();
    }

    async fetchYahooTokens(code: string | undefined): Promise<any> {
        return axios({
            method: 'post',
            url: 'https://api.login.yahoo.com/oauth2/get_token',
            data: `client_id=${process.env.YAHOO_APPLICATION_KEY}&client_secret=${process.env.YAHOO_SECRET_KEY}&redirect_uri=oob&code=${code}&grant_type=authorization_code`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    }

    async refreshYahooAccessTokens(refresh_token: string | null): Promise<any> {
        const authKey = Buffer.from(`${process.env.YAHOO_APPLICATION_KEY}:${process.env.YAHOO_SECRET_KEY}`).toString(
            'base64',
        );
        return axios({
            method: 'post',
            url: 'https://api.login.yahoo.com/oauth2/get_token',
            data: `client_id=${process.env.YAHOO_APPLICATION_KEY}&client_secret=${process.env.YAHOO_SECRET_KEY}&redirect_uri=oob&refresh_token=${refresh_token}&grant_type=refresh_token`,
            headers: {
                Authorization: `Basic ${authKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    }

    async fetchESPNAccount(espnS2: string, swid: string): Promise<any> {
        return axios({
            method: 'get',
            url: `https://fan.api.espn.com/apis/v2/fans/${swid}?featureFlags=challengeEntries&featureFlags=expandAthlete&featureFlags=isolateEvents&showAirings=buy,live,replay&source=ESPN.com+-+FAM&lang=en&section=espn&region=us`,
            headers: {
                Cookie: `SWID=${swid};espn_S2=${espnS2}`,
            },
        });
    }

    async fetchESPNLeague(espnS2: string, swid: string, leagueId: string): Promise<any> {
        const myClient = new Client({ leagueId });
        myClient.setCookies({ espnS2: espnS2, SWID: swid });
        const response = await this.fetchESPNAccount(espnS2, swid);
        let seasonId;
        let scoringPeriodId;
        response.data.preferences
            .filter((data: any) => {
                const { id } = data;
                const meta = id.split(':');
                return meta.length == 4;
            })
            .filter((data: any) => {
                const leagueType = data.metaData.entry.abbrev;
                return leagueType === 'FFL';
            })
            .map((preference: any) => {
                const { id } = preference;
                const meta = id.split(':');
                const prefleagueId = meta[1];
                seasonId = meta[3];
                scoringPeriodId = meta[2];
                if (prefleagueId === leagueId) {
                    return false;
                }
            });

        const league = await myClient.getLeagueInfo({ seasonId });
        return { ...league, seasonId: seasonId };
    }

    async fetchESPNLeagueTeams(espnS2: string, swid: string, leagueId: string): Promise<any> {
        const myClient = new Client({ leagueId });
        myClient.setCookies({ espnS2: espnS2, SWID: swid });
        const response = await this.fetchESPNAccount(espnS2, swid);
        let seasonId;
        let scoringPeriodId;
        response.data.preferences
            .filter((data: any) => {
                const { id } = data;
                const meta = id.split(':');
                return meta.length == 4;
            })
            .filter((data: any) => {
                const leagueType = data.metaData.entry.abbrev;
                return leagueType === 'FFL';
            })
            .map((preference: any) => {
                const { id } = preference;
                const meta = id.split(':');
                const prefleagueId = meta[1];
                seasonId = meta[3];
                scoringPeriodId = meta[2];
                if (prefleagueId === leagueId) {
                    return false;
                }
            });

        const teams = await myClient.getTeamsAtWeek({ seasonId, scoringPeriodId });
        return teams;
    }

    async fetchESPNLeagueTeamsByIds(
        espnS2: string,
        swid: string,
        teamIds: number[],
        seasonId: string,
        leagueId: string,
    ): Promise<any> {
        let teamIdsString = '';
        teamIds.map((teamId: number, index: number) => {
            if (index === 0) {
                teamIdsString = `rosterForTeamId=${teamId}`;
            } else {
                teamIdsString = `${teamIdsString}&rosterForTeamId=${teamId}`;
            }
        });

        const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}?${teamIdsString}&view=mDraftDetail&view=mLiveScoring&view=mMatchupScore&view=mPendingTransactions&view=mPositionalRatings&view=mRoster&view=mSettings&view=mTeam&view=modular&view=mNav`;

        return axios({
            method: 'get',
            url: url,
            headers: {
                Cookie: `espn_s2=${espnS2}; SWID=${swid};`,
            },
        });
    }

    async findPlayer(remotePlayer: any, localPlayers: any, position: string, source: string): Promise<any> {
        let foundLocalPlayer = null;
        if (source === 'yahoo') {
            foundLocalPlayer = localPlayers.find(
                (localPlayer: any) => Number(remotePlayer.player_id) === localPlayer.yahooPlayerId,
            );
        } else if (source === 'espn') {
            foundLocalPlayer = localPlayers.find(
                (localPlayer: any) => Number(remotePlayer.player_id) === localPlayer.espnPlayerId,
            );
        }
        // When imported player's id from roster does not match in our DB, then try finding corresponding player by name
        if (!foundLocalPlayer) {
            if (position === 'DEF') {
                foundLocalPlayer = localPlayers.find(
                    (localPlayer: any) =>
                        remotePlayer.name.first === localPlayer.firstName &&
                        remotePlayer.display_position === localPlayer.position,
                );
            } else {
                foundLocalPlayer = localPlayers.find(
                    (localPlayer: any) =>
                        remotePlayer.name.first === localPlayer.firstName &&
                        remotePlayer.name.last === localPlayer.lastName &&
                        remotePlayer.display_position === localPlayer.position,
                );
            }
        }
        return foundLocalPlayer;
    }

    async calculateSpread(
        creatorProjectedPoints: number,
        opponentProjectedPoints: number,
        type: string,
        spreadType: string,
    ) {
        let spread = 0;

        if (type === 'creator') {
            spread = MiscHelpers.roundValue(opponentProjectedPoints - creatorProjectedPoints, 0.5);
        } else {
            spread = MiscHelpers.roundValue(creatorProjectedPoints - opponentProjectedPoints, 0.5);
        }

        const spreadData = await this.spreadRepo.findOne({
            where: {
                projectionSpread: spread,
                spreadType: spreadType,
            },
        });

        return spreadData ? spreadData.spread : 0;
    }

    async calculateCover(spread: number, entry: number, winBonus: boolean, spreadType: string) {
        let cover = 0;
        const spreadData = await this.spreadRepo.findOne({
            where: {
                spread: spread,
                spreadType: spreadType,
            },
        });

        if (winBonus) {
            cover = entry * 0.85 * (spreadData ? spreadData.spreadPay : 0);
        } else {
            cover = entry * (spreadData ? spreadData.spreadPay : 0);
        }
        return cover;
    }

    async calculateWinBonus(spread: number, entry: number, spreadType: string) {
        let winBonus = 0;
        const spreadData = await this.spreadRepo.findOne({
            where: {
                spread: spread,
                spreadType: spreadType,
            },
        });
        const MLPay = spreadData ? spreadData.mlPay : 0;
        winBonus = entry * 0.15 * MLPay;
        return winBonus;
    }

    async pingYahoo(accessToken: string, leagueKey: string) {
        const resp = await axios({
            url: `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/teams`,

            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        return resp.data;
    }

    async resyncYahoo(localLeagueId: number) {
        const localLeague = await this.leagueRepository.findById(Number(localLeagueId));

        if (!localLeague?.userId) {
            return;
        }
        const userId = localLeague.userId;

        const userData = await this.userRepository.findById(userId);

        if (!localLeague.remoteId) {
            return;
        }
        const leagueId = localLeague.remoteId;

        const teamObjects: any[] = [];
        const rosterObjects: any[] = [];
        const newTeams: any[] = [];
        let league;

        const notFoundPlayers: any[] = [];

        try {
            const refreshedYahooTokens = await this.refreshYahooAccessTokens(userData.yahooRefreshToken);

            const { access_token, refresh_token } = refreshedYahooTokens.data;
            userData.yahooAccessToken = access_token ? access_token : userData.yahooAccessToken;
            userData.yahooRefreshToken = refresh_token ? refresh_token : userData.yahooRefreshToken;

            try {
                await this.pingYahoo(access_token, leagueId);
            } catch (err) {
                throw new Error('Aborting Yahoo Calls');
            }

            const yf = new YahooFantasy(
                process.env.YAHOO_APPLICATION_KEY,
                process.env.YAHOO_SECRET_KEY,
                ({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
                    return new Promise<void>((resolve, reject) => {
                        const newAccessToken = access_token;
                        const newRefreshToken = refresh_token;
                        userData.yahooAccessToken = newAccessToken ? newAccessToken : userData.yahooAccessToken;
                        userData.yahooRefreshToken = newRefreshToken ? newRefreshToken : userData.yahooRefreshToken;
                        this.userRepository.save(userData).then(() => {
                            return resolve();
                        });
                    });
                },
            );
            yf.setUserToken(access_token);
            yf.setRefreshToken(refresh_token);

            const localPlayers = await this.playerRepo.find();
            const localTeams = await this.teamRepository.find({
                where: {
                    leagueId: localLeagueId,
                },
            });
            // console.log("🚀 ~ file: league.service.ts ~ line 216 ~ LeagueService ~ resyncYahoo ~ localTeams", localTeams)

            const teams = await yf.league.teams(leagueId);
            await Promise.all(
                teams.teams.map(async (team: any) => {
                    const foundLocalTeam = localTeams.find(localTeam => team.team_key === localTeam.remoteId);

                    if (foundLocalTeam) {
                        foundLocalTeam.name = team.name;
                        foundLocalTeam.remoteId = team.team_key;
                        foundLocalTeam.logoUrl = team.team_logos[0].url;
                        foundLocalTeam.wordMarkUrl = team.url;
                        foundLocalTeam.leagueId = Number(localLeagueId);
                        teamObjects.push(foundLocalTeam);

                        // await this.teamRepository.save(foundLocalTeam, { transaction });

                        // await this.rosterRepository.deleteAll(
                        //     {
                        //         teamId: foundLocalTeam.id,
                        //     },
                        //     { transaction },
                        // );

                        const roster = await yf.team.roster(team.team_key);

                        await Promise.all(
                            roster.roster.map(async (remotePlayer: any) => {
                                if (!YAHOO_BLOCKED_POSITION_LIST.includes(remotePlayer.selected_position)) {
                                    const foundPlayer = await this.findPlayer(
                                        remotePlayer,
                                        localPlayers,
                                        remotePlayer.selected_position,
                                        'yahoo',
                                    );

                                    if (!foundPlayer) {
                                        notFoundPlayers.push(remotePlayer);
                                        // throw new HttpErrors.BadRequest(
                                        //     `${normalisedRemotePlayer.name.first} ${normalisedRemotePlayer.name.last} from "${createdTeam.name}" does not exist in our system. Our team is working on it. We apologies for the inconvenience`,
                                        // );
                                    } else {
                                        const rosterData = new Roster();
                                        rosterData.teamId = foundLocalTeam.id;
                                        rosterData.playerId = foundPlayer.id;
                                        rosterData.displayPosition = remotePlayer.display_position || '';
                                        rosterObjects.push(rosterData);
                                        // await this.rosterRepository.create(rosterData, { transaction });
                                    }
                                }

                                return false;
                            }),
                        );
                    } else {
                        const newTeam: any = {
                            team: null,
                            roster: [],
                        };
                        const teamData = new Team();

                        teamData.name = team.name;
                        teamData.remoteId = team.team_key;
                        teamData.logoUrl = team.team_logos[0].url;
                        teamData.wordMarkUrl = team.url;
                        teamData.leagueId = Number(localLeagueId);

                        newTeam.team = teamData;

                        // const createdTeam = await this.teamRepository.create(teamData, { transaction });

                        const roster = await yf.team.roster(team.team_key.remoteId);

                        await Promise.all(
                            roster.roster.map(async (remotePlayer: any) => {
                                if (!YAHOO_BLOCKED_POSITION_LIST.includes(remotePlayer.selected_position)) {
                                    const foundPlayer = await this.findPlayer(
                                        remotePlayer,
                                        localPlayers,
                                        remotePlayer.selected_position,
                                        'yahoo',
                                    );

                                    if (!foundPlayer) {
                                        notFoundPlayers.push(remotePlayer);
                                        // throw new HttpErrors.BadRequest(
                                        //     `${normalisedRemotePlayer.name.first} ${normalisedRemotePlayer.name.last} from "${createdTeam.name}" does not exist in our system. Our team is working on it. We apologies for the inconvenience`,
                                        // );
                                    } else {
                                        const rosterData = new Roster();
                                        // rosterData.teamId = createdTeam.id;
                                        rosterData.playerId = foundPlayer.id;
                                        rosterData.displayPosition = remotePlayer.display_position || '';
                                        newTeam.roster.push(rosterData);
                                        // await this.rosterRepository.create(rosterData, { transaction });
                                    }
                                }

                                return false;
                            }),
                        );
                    }
                }),
            );

            league = await yf.league.meta(leagueId);
        } catch (error) {
            await this.handleSyncFail(localLeagueId, 'YAHOO');

            if (error.response) {
                logger.error(
                    chalk.redBright(
                        `Error on yahoo league sync for leagueID ${leagueId} at ${moment().format(
                            'DD-MM-YYYY hh:mm:ss a',
                        )} `,
                        error.response.data.error_description,
                    ),
                );
            } else {
                logger.error(
                    chalk.redBright(
                        `Error on yahoo league sync for leagueID ${leagueId} at ${moment().format(
                            'DD-MM-YYYY hh:mm:ss a',
                        )} `,
                        error.message,
                    ),
                );
            }

            return false;
        }

        // @ts-ignore
        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.READ_COMMITTED);

        try {
            await Promise.all(
                teamObjects.map(async (team: any) => {
                    await this.teamRepository.save(team, { transaction });

                    await this.rosterRepository.deleteAll(
                        {
                            teamId: team.id,
                        },
                        { transaction },
                    );
                }),
            );

            await Promise.all(
                rosterObjects.map(async (rosterEntry: any) => {
                    await this.rosterRepository.create(rosterEntry, { transaction });
                }),
            );

            await Promise.all(
                newTeams.map(async (newTeam: any) => {
                    const createdTeam = await this.teamRepository.create(newTeam.team, { transaction });
                    await Promise.all(
                        newTeam.roster.map(async (rosterEntry: any) => {
                            rosterEntry.teamId = createdTeam.id;
                            await this.rosterRepository.create(rosterEntry, { transaction });
                        }),
                    );
                }),
            );

            const leagueData = new League();

            leagueData.name = league.name;
            leagueData.syncStatus = 'success';
            leagueData.lastSyncTime = new Date();
            leagueData.userId = userId;

            const updatedLeague = await this.leagueRepository.updateById(Number(localLeagueId), leagueData, {
                transaction,
            });

            // await transaction.rollback();
            await transaction.commit();
        } catch (error) {
            console.log('resyncYahoo: Ln 462 league.service.ts ~ error', error);
            await transaction.rollback();

            await this.handleSyncFail(localLeagueId, 'YAHOO');
            return false;
        }

        if (notFoundPlayers.length > 0) {
            await this.handleMissingPlayer(localLeagueId, 'YAHOO', notFoundPlayers);
        }

        return true;
    }

    async resyncESPN(localLeagueId: number) {
        const localLeague = await this.leagueRepository.findById(Number(localLeagueId));

        const userId = localLeague ? localLeague.userId : 0;

        const userData = await this.userRepository.findById(userId);

        const leagueId = localLeague ? localLeague.remoteId : 0;

        const { espns2, espnswid } = userData;

        let league;
        let teamsInfo;
        let teamIds;
        let leaguePromise;

        try {
            league = await this.fetchESPNLeague(espns2 || '', espnswid || '', leagueId || '');

            teamsInfo = await this.fetchESPNLeagueTeams(espns2 || '', espnswid || '', leagueId || '');

            teamIds = teamsInfo.map((team: any) => team.id);

            leaguePromise = await this.fetchESPNLeagueTeamsByIds(
                espns2 || '',
                espnswid || '',
                teamIds,
                league.seasonId,
                leagueId || '',
            );
        } catch (error) {
            logger.error(
                chalk.redBright(
                    `Error on espn league sync for leagueID ${leagueId} at ${moment().format(
                        'DD-MM-YYYY hh:mm:ss a',
                    )} `,
                    error,
                ),
            );

            await this.handleSyncFail(localLeagueId, 'ESPN');
        }

        const leagueInfo = leaguePromise.data;

        const notFoundPlayers: any[] = [];

        const { teams } = leagueInfo;

        const localPlayers = await this.playerRepo.find();
        const localTeams = await this.teamRepository.find({
            where: {
                leagueId: localLeagueId,
            },
        });

        const teamObjects: any[] = [];
        const rosterObjects: any[] = [];

        const newTeams: any[] = [];

        await Promise.all(
            teams.map(async (team: any) => {
                const foundLocalTeam = localTeams.find(localTeam => `${leagueId}-${team.id}` === localTeam.remoteId);

                if (foundLocalTeam) {
                    foundLocalTeam.name = `${team.location} ${team.nickname}`;
                    foundLocalTeam.remoteId = `${leagueId}-${team.id}`;
                    foundLocalTeam.logoUrl = team.logo;
                    foundLocalTeam.wordMarkUrl = team.abbrev;
                    // foundLocalTeam.leagueId = Number(localLeagueId);

                    teamObjects.push(foundLocalTeam);
                    // await this.teamRepository.save(foundLocalTeam);

                    // await this.rosterRepository.deleteAll(
                    //     {
                    //         teamId: foundLocalTeam.id,
                    //     },
                    //     { transaction },
                    // );

                    const roster = team?.roster ? team.roster.entries : [];

                    const sortedRoster = roster.sort((a: any, b: any) => {
                        return a.lineupSlotId - b.lineupSlotId;
                    });

                    await Promise.all(
                        sortedRoster.map(async (remotePlayer: any) => {
                            if (!ESPN_BLOCKED_LINEUPID_LIST.includes(remotePlayer.lineupSlotId)) {
                                const normalisedRemotePlayer = {
                                    name: {
                                        first: remotePlayer?.playerPoolEntry?.player.firstName,
                                        last: remotePlayer?.playerPoolEntry?.player.lastName,
                                    },
                                    player_id: remotePlayer?.playerPoolEntry?.player.id,
                                    display_position:
                                        ESPN_POSITION_MAPPING[remotePlayer?.playerPoolEntry?.player.defaultPositionId],
                                    team_position: ESPN_LINEUP_SLOT_MAPPING[remotePlayer?.lineupSlotId],
                                };

                                const foundPlayer = await this.findPlayer(
                                    normalisedRemotePlayer,
                                    localPlayers,
                                    normalisedRemotePlayer.team_position,
                                    'espn',
                                );

                                if (!foundPlayer) {
                                    notFoundPlayers.push(remotePlayer);
                                    // throw new HttpErrors.BadRequest(
                                    //     `${normalisedRemotePlayer.name.first} ${normalisedRemotePlayer.name.last} from "${createdTeam.name}" does not exist in our system. Our team is working on it. We apologies for the inconvenience`,
                                    // );
                                } else {
                                    const rosterData = new Roster();
                                    rosterData.teamId = foundLocalTeam.id;
                                    rosterData.playerId = foundPlayer.id;
                                    rosterData.displayPosition = normalisedRemotePlayer.display_position || '';
                                    rosterObjects.push(rosterData);

                                    if (!normalisedRemotePlayer.display_position) {
                                        // console.log("🚀 ~ file: league.service.ts ~ line 621 ~ LeagueService ~ sortedRoster.map ~ normalisedRemotePlayer", normalisedRemotePlayer)
                                        logger.error(
                                            chalk.redBright(
                                                `${foundPlayer.fullName} does not have a display position when returned from ESPN`,
                                            ),
                                        );
                                    }

                                    // await this.rosterRepository.create(rosterData, { transaction });
                                }
                            }
                        }),
                    );
                } else {
                    const newTeam: any = {
                        team: null,
                        roster: [],
                    };

                    const teamData = new Team();
                    teamData.name = `${team.location} ${team.nickname}`;
                    teamData.remoteId = `${leagueId}-${team.id}`;
                    teamData.logoUrl = team.logo;
                    teamData.wordMarkUrl = team.abbrev;

                    newTeam.team = teamData;

                    // const createdTeam = await this.teamRepository.create(teamData, { transaction });

                    const roster = team?.roster ? team.roster.entries : [];

                    const sortedRoster = roster.sort((a: any, b: any) => {
                        return a.lineupSlotId - b.lineupSlotId;
                    });

                    await Promise.all(
                        sortedRoster.map(async (remotePlayer: any) => {
                            if (!ESPN_BLOCKED_LINEUPID_LIST.includes(remotePlayer.lineupSlotId)) {
                                const normalisedRemotePlayer = {
                                    name: {
                                        first: remotePlayer?.playerPoolEntry?.player.firstName,
                                        last: remotePlayer?.playerPoolEntry?.player.lastName,
                                    },
                                    player_id: remotePlayer?.playerPoolEntry?.player.id,
                                    display_position:
                                        ESPN_POSITION_MAPPING[remotePlayer?.playerPoolEntry?.player.defaultPositionId],
                                    team_position: ESPN_LINEUP_SLOT_MAPPING[remotePlayer?.lineupSlotId],
                                };

                                const foundPlayer = await this.findPlayer(
                                    normalisedRemotePlayer,
                                    localPlayers,
                                    normalisedRemotePlayer.team_position,
                                    'espn',
                                );

                                if (!foundPlayer) {
                                    notFoundPlayers.push(remotePlayer);
                                    // throw new HttpErrors.BadRequest(
                                    //     `${normalisedRemotePlayer.name.first} ${normalisedRemotePlayer.name.last} from "${createdTeam.name}" does not exist in our system. Our team is working on it. We apologies for the inconvenience`,
                                    // );
                                } else {
                                    const rosterData = new Roster();
                                    // rosterData.teamId = createdTeam.id;
                                    rosterData.playerId = foundPlayer.id;
                                    rosterData.displayPosition = normalisedRemotePlayer.display_position || '';
                                    newTeam.roster.push(rosterData);
                                    // await this.rosterRepository.create(rosterData, { transaction });
                                }
                            }

                            return false;
                        }),
                    );

                    newTeams.push(newTeam);
                }

                return false;
            }),
        );

        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.READ_COMMITTED);

        try {
            await Promise.all(
                teamObjects.map(async (team: any) => {
                    await this.teamRepository.save(team, { transaction });

                    await this.rosterRepository.deleteAll(
                        {
                            teamId: team.id,
                        },
                        { transaction },
                    );
                }),
            );

            await Promise.all(
                rosterObjects.map(async (rosterEntry: any) => {
                    await this.rosterRepository.create(rosterEntry, { transaction });
                }),
            );

            await Promise.all(
                newTeams.map(async (newTeam: any) => {
                    const createdTeam = await this.teamRepository.create(newTeam.team, { transaction });
                    await Promise.all(
                        newTeam.roster.map(async (rosterEntry: any) => {
                            rosterEntry.teamId = createdTeam.id;
                            await this.rosterRepository.create(rosterEntry, { transaction });
                        }),
                    );
                }),
            );

            const leagueData = new League();

            leagueData.name = league.name;
            leagueData.syncStatus = 'success';
            leagueData.lastSyncTime = new Date();
            leagueData.userId = userId;

            const updatedLeague = await this.leagueRepository.updateById(Number(localLeagueId), leagueData, {
                transaction,
            });

            // await transaction.rollback();
            await transaction.commit();
        } catch (error) {
            console.log('resyncESPN: Ln 562 league.service.ts ~ error', error);
            await transaction.rollback();

            await this.handleSyncFail(localLeagueId, 'ESPN');

            return false;
        }

        if (notFoundPlayers.length > 0) {
            await this.handleMissingPlayer(localLeagueId, 'ESPN', notFoundPlayers);
        }
        return true;
    }

    async handleSyncFail(leagueId: number, sourceName: string) {
        const localLeague = await this.leagueRepository.findById(Number(leagueId));
        if (localLeague.syncStatus === 'success') {
            const leagueData = new League();
            leagueData.syncStatus = 'failed';
            await this.leagueRepository.updateById(Number(localLeague.id), leagueData);

            const templateData = {
                user: {
                    fullName: 'League Commissioner',
                },
                leagueId: leagueId,
                sourceName: sourceName,
                text: {
                    title: 'Top Prop - Sync Failed',
                    subtitle: `League Sync failed for league - ${localLeague.name}`,
                },
            };

            await this.userService.sendEmail(localLeague.userId, EMAIL_TEMPLATES.ADMIN_SYNC_FAILED, templateData);
        }
    }

    async handleMissingPlayer(leagueId: number, sourceName: string, playerList: any) {
        const localLeague = await this.leagueRepository.findById(Number(leagueId));

        const missingPlayerNames = playerList.map((player: any) => {
            return player?.name?.full;
        });
        const templateData = {
            user: {
                fullName: 'Admin',
            },
            leagueId: leagueId,
            sourceName: sourceName,
            playerList,
            text: {
                title: 'Player Not Found.',
                subtitle: `Missing players from the TopProp system, for league - ${localLeague.name} are :
                ${missingPlayerNames.toString()}`,
            },
        };

        const adminEmail = process.env.SUPPORT_EMAIL_ADDRESS
            ? process.env.SUPPORT_EMAIL_ADDRESS
            : localLeague.user?.email;

        await this.userService.sendEmail(
            localLeague.userId,
            EMAIL_TEMPLATES.ADMIN_SYNC_FAILED_PLAYER_NOT_FOUND,
            templateData,
            adminEmail,
        );
    }

    async invalidateLeagueSync(leagueId: number) {}

    async fetchLeagueInclude() {
        return {
            include: [
                {
                    relation: 'teams',
                    scope: {
                        include: [
                            {
                                relation: 'user',
                            },
                            {
                                relation: 'rosters',
                                scope: {
                                    include: [{ relation: 'player' }],
                                },
                            },
                        ],
                    },
                },
                {
                    relation: 'members',
                    scope: {
                        include: ['user'],
                    },
                },
                {
                    relation: 'scoringType',
                },
            ],
        };
    }

    async fetchLeagueContestInclude() {
        return {
            include: [
                {
                    relation: 'creatorTeam',
                    scope: {
                        include: [
                            {
                                relation: 'rosters',
                                scope: {
                                    include: [
                                        {
                                            relation: 'player',
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
                {
                    relation: 'claimerTeam',
                    scope: {
                        include: [
                            {
                                relation: 'rosters',
                                scope: {
                                    include: [
                                        {
                                            relation: 'player',
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
                {
                    relation: 'creatorContestTeam',
                    scope: {
                        include: [
                            {
                                relation: 'contestRosters',
                                scope: {
                                    include: [
                                        {
                                            relation: 'player',
                                        },
                                    ],
                                },
                            },
                            {
                                relation: 'team',
                            },
                        ],
                    },
                },
                {
                    relation: 'claimerContestTeam',
                    scope: {
                        include: [
                            {
                                relation: 'contestRosters',
                                scope: {
                                    include: [
                                        {
                                            relation: 'player',
                                        },
                                    ],
                                },
                            },
                            {
                                relation: 'team',
                            },
                        ],
                    },
                },
                {
                    relation: 'league',
                },
            ],
        };
    }
}
