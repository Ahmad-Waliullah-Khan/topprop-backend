import { bind, injectable, BindingScope, Getter } from '@loopback/core';
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
import { MiscHelpers } from '@src/utils/helpers';
import { ESPN_LINEUP_SLOT_MAPPING, ESPN_POSITION_MAPPING } from '@src/utils/constants/league.constants';
import axios from 'axios';
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
        response.data.preferences.map((preference: any) => {
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
        response.data.preferences.map((preference: any) => {
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

    async fetchESPNLeagueTeamsByIds(teamIds: number[], seasonId: string, leagueId: string): Promise<any> {
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
        });
    }

    async findPlayer(remotePlayer: any, localPlayers: any, position: string): Promise<any> {
        let foundLocalPlayer = null;
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

    async resyncYahoo(localLeagueId?: number) {
        const localLeague = await this.leagueRepository.findById(Number(localLeagueId));

        const userId = localLeague ? localLeague.userId : 0;

        const userData = await this.userRepository.findById(userId);

        const leagueId = localLeague ? localLeague.remoteId : 0;

        const refreshedYahooTokens = await this.refreshYahooAccessTokens(userData.yahooRefreshToken);

        const { access_token, refresh_token } = refreshedYahooTokens;
        userData.yahooAccessToken = access_token ? access_token : userData.yahooAccessToken;
        userData.yahooRefreshToken = refresh_token ? refresh_token : userData.yahooRefreshToken;

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
        yf.setUserToken(userData.yahooAccessToken);
        yf.setRefreshToken(userData.yahooRefreshToken);

        // @ts-ignore
        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.SERIALIZABLE);

        try {
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
                        await this.teamRepository.save(foundLocalTeam);

                        await this.rosterRepository.deleteAll({
                            teamId: foundLocalTeam.id,
                        });

                        const roster = await yf.team.roster(team.team_key);

                        await Promise.all(
                            roster.roster.map(async (remotePlayer: any) => {
                                if (remotePlayer.selected_position !== 'BN') {
                                    const foundPlayer = await this.findPlayer(
                                        remotePlayer,
                                        localPlayers,
                                        remotePlayer.selected_position,
                                    );

                                    const rosterData = new Roster();
                                    rosterData.teamId = foundLocalTeam.id;
                                    rosterData.playerId = foundPlayer.id;
                                    rosterData.displayPosition = remotePlayer.display_position;
                                    await this.rosterRepository.create(rosterData, { transaction });
                                }

                                return false;
                            }),
                        );
                    } else {
                        const teamData = new Team();

                        teamData.name = team.name;
                        teamData.remoteId = team.team_key;
                        teamData.logoUrl = team.team_logos[0].url;
                        teamData.wordMarkUrl = team.url;
                        teamData.leagueId = Number(localLeagueId);
                        const createdTeam = await this.teamRepository.create(teamData, { transaction });

                        const roster = await yf.team.roster(createdTeam.remoteId);

                        await Promise.all(
                            roster.roster.map(async (remotePlayer: any) => {
                                if (remotePlayer.selected_position !== 'BN') {
                                    const foundPlayer = await this.findPlayer(
                                        remotePlayer,
                                        localPlayers,
                                        remotePlayer.selected_position,
                                    );
                                    const rosterData = new Roster();
                                    rosterData.teamId = createdTeam.id;
                                    rosterData.playerId = foundPlayer.id;
                                    rosterData.displayPosition = remotePlayer.display_position;
                                    await this.rosterRepository.create(rosterData, { transaction });
                                }

                                return false;
                            }),
                        );
                    }
                }),
            );

            const league = await yf.league.meta(leagueId);
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
            console.log('🚀 ~ file: league.service.ts ~ error', error);
            await transaction.rollback();
            return false;
        }

        return true;
    }

    async resyncESPN(localLeagueId?: number) {
        const localLeague = await this.leagueRepository.findById(Number(localLeagueId));

        const userId = localLeague ? localLeague.userId : 0;

        const userData = await this.userRepository.findById(userId);

        const leagueId = localLeague ? localLeague.remoteId : 0;

        const { espns2, espnswid } = userData;

        // @ts-ignore
        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.SERIALIZABLE);
        try {
            const league = await this.fetchESPNLeague(espns2 || '', espnswid || '', leagueId || '');

            const teamsInfo = await this.fetchESPNLeagueTeams(espns2 || '', espnswid || '', leagueId || '');

            const teamIds = teamsInfo.map((team: any) => team.id);

            const leaguePromise = await this.fetchESPNLeagueTeamsByIds(teamIds, league.seasonId, leagueId || '');

            const leagueInfo = leaguePromise.data;

            const notFoundPlayers: any[] = [];

            const { teams } = leagueInfo;

            const localPlayers = await this.playerRepo.find();
            const localTeams = await this.teamRepository.find({
                where: {
                    leagueId: localLeagueId,
                },
            });

            await Promise.all(
                teams.map(async (team: any) => {
                    const foundLocalTeam = localTeams.find(
                        localTeam => `${leagueId}-${team.id}` === localTeam.remoteId,
                    );

                    if (foundLocalTeam) {
                        foundLocalTeam.name = `${team.location} ${team.nickname}`;
                        foundLocalTeam.remoteId = `${leagueId}-${team.id}`;
                        foundLocalTeam.logoUrl = team.logo;
                        foundLocalTeam.wordMarkUrl = team.abbrev;
                        // foundLocalTeam.leagueId = Number(localLeagueId);
                        await this.teamRepository.save(foundLocalTeam);

                        await this.rosterRepository.deleteAll({
                            teamId: foundLocalTeam.id,
                        });

                        const roster = team?.roster ? team.roster.entries : [];

                        const sortedRoster = roster.sort((a: any, b: any) => {
                            return a.lineupSlotId - b.lineupSlotId;
                        });

                        await Promise.all(
                            sortedRoster.map(async (remotePlayer: any) => {
                                if (remotePlayer.lineupSlotId !== 20) {
                                    const normalisedRemotePlayer = {
                                        name: {
                                            first: remotePlayer?.playerPoolEntry?.player.firstName,
                                            last: remotePlayer?.playerPoolEntry?.player.lastName,
                                        },
                                        display_position:
                                            ESPN_POSITION_MAPPING[
                                                remotePlayer?.playerPoolEntry?.player.defaultPositionId
                                            ],
                                        team_position: ESPN_LINEUP_SLOT_MAPPING[remotePlayer?.lineupSlotId],
                                    };

                                    const foundPlayer = await this.findPlayer(
                                        normalisedRemotePlayer,
                                        localPlayers,
                                        normalisedRemotePlayer.team_position,
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
                                        rosterData.displayPosition = normalisedRemotePlayer.team_position;
                                        await this.rosterRepository.create(rosterData, { transaction });
                                    }
                                }
                            }),
                        );
                    } else {
                        const teamData = new Team();

                        teamData.name = `${team.location} ${team.nickname}`;
                        teamData.remoteId = `${leagueId}-${team.id}`;
                        teamData.logoUrl = team.logo;
                        teamData.wordMarkUrl = team.abbrev;
                        const createdTeam = await this.teamRepository.create(teamData, { transaction });

                        const roster = team?.roster ? team.roster.entries : [];

                        const sortedRoster = roster.sort((a: any, b: any) => {
                            return a.lineupSlotId - b.lineupSlotId;
                        });

                        await Promise.all(
                            sortedRoster.map(async (remotePlayer: any) => {
                                if (remotePlayer.lineupSlotId !== 20) {
                                    const normalisedRemotePlayer = {
                                        name: {
                                            first: remotePlayer?.playerPoolEntry?.player.firstName,
                                            last: remotePlayer?.playerPoolEntry?.player.lastName,
                                        },
                                        display_position:
                                            ESPN_POSITION_MAPPING[
                                                remotePlayer?.playerPoolEntry?.player.defaultPositionId
                                            ],
                                        team_position: ESPN_LINEUP_SLOT_MAPPING[remotePlayer?.lineupSlotId],
                                    };

                                    const foundPlayer = await this.findPlayer(
                                        normalisedRemotePlayer,
                                        localPlayers,
                                        normalisedRemotePlayer.team_position,
                                    );

                                    if (!foundPlayer) {
                                        notFoundPlayers.push(remotePlayer);
                                        // throw new HttpErrors.BadRequest(
                                        //     `${normalisedRemotePlayer.name.first} ${normalisedRemotePlayer.name.last} from "${createdTeam.name}" does not exist in our system. Our team is working on it. We apologies for the inconvenience`,
                                        // );
                                    } else {
                                        const rosterData = new Roster();
                                        rosterData.teamId = createdTeam.id;
                                        rosterData.playerId = foundPlayer.id;
                                        rosterData.displayPosition = normalisedRemotePlayer.team_position;
                                        await this.rosterRepository.create(rosterData, { transaction });
                                    }
                                }

                                return false;
                            }),
                        );
                    }

                    return false;
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
            console.log('🚀 ~ file: league.service.ts ~ error', error);
            await transaction.rollback();
            return false;
        }

        return true;
    }

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
