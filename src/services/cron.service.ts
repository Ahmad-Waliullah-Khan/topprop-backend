import { BindingScope, injectable, service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { Gain, Player, Timeframe } from '@src/models';
import {
    ContestRepository,
    ContestRosterRepository,
    GainRepository,
    LeagueContestRepository,
    LeagueRepository,
    PlayerRepository,
    RosterRepository,
    TeamRepository,
    TimeframeRepository,
    UserRepository,
} from '@src/repositories';
import { MiscHelpers } from '@src/utils/helpers';
import chalk from 'chalk';
import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import moment from 'moment';
import util from 'util';
import { LeagueService } from '../services/league.service';
import { SportsDataService } from '../services/sports-data.service';
import { UserService } from '../services/user.service';
import {
    CONTEST_STAKEHOLDERS,
    CONTEST_STATUSES,
    CRON_JOBS,
    CRON_RUN_TYPES,
    EMAIL_TEMPLATES,
    PROXY_DAY,
    PROXY_DAY_OFFSET,
    PROXY_MONTH,
    PROXY_YEAR,
    RUN_TYPE,
    SCORING_TYPE,
    TIMEFRAMES,
} from '../utils/constants';
import { DST_IDS } from '../utils/constants/dst.constants';
import logger from '../utils/logger';
import sleep from '../utils/sleep';

@injectable({ scope: BindingScope.TRANSIENT })
export class CronService {
    constructor(
        @service() private sportsDataService: SportsDataService,
        @service() private userService: UserService,
        @service() private leagueService: LeagueService,
        @repository('PlayerRepository') private playerRepository: PlayerRepository,
        @repository('TimeframeRepository') private timeframeRepository: TimeframeRepository,
        @repository('ContestRepository') private contestRepository: ContestRepository,
        @repository('GainRepository') private gainRepository: GainRepository,
        @repository('UserRepository') private userRepository: UserRepository,
        @repository('LeagueContestRepository') private leagueContestRepository: LeagueContestRepository,
        @repository('TeamRepository') private teamRepository: TeamRepository,
        @repository('RosterRepository') private rosterRepository: RosterRepository,
        @repository('ContestRosterRepository') private contestRosterRepository: ContestRosterRepository,
        @repository('LeagueRepository') private leagueRepository: LeagueRepository,
    ) {}

    async fetchDate() {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE) {
            return moment();
        } else {
            return moment(`${PROXY_YEAR}-${PROXY_MONTH}-${PROXY_DAY}`, 'YYYY-MMM-DD');
        }
    }

    async fetchSeason() {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE) {
            const currentDate = moment();
            const currentMonth = currentDate.month();
            if (currentMonth < 6) {
                // Before July
                return currentDate.subtract(1, 'years').year();
            } else {
                // July Onwards
                return currentDate.year();
            }
        } else {
            const currentDate = moment(`${PROXY_YEAR}-${PROXY_MONTH}-${PROXY_DAY}`, 'YYYY-MMM-DD');
            const currentMonth = currentDate.month();
            if (currentMonth < 6) {
                // Before July
                return currentDate.subtract(1, 'years').year();
            } else {
                // July Onwards
                return currentDate.year();
            }
        }
    }

    async fetchTimeframe() {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE) {
            const [remoteTimeFrame] = await this.sportsDataService.timeFrames(TIMEFRAMES.CURRENT);
            const currentTimeFrame = new Timeframe(remoteTimeFrame);
            return currentTimeFrame;
        } else {
            const currentDate = moment(`${PROXY_YEAR}-${PROXY_MONTH}-${PROXY_DAY}`, 'YYYY-MMM-DD');
            currentDate.add(PROXY_DAY_OFFSET, 'days');
            // console.log("🚀 ~ file: cron.service.ts ~ line 60 ~ CronService ~ fetchTimeframe ~ currentDate", currentDate)
            const [currentTimeFrame] = await this.timeframeRepository.find({
                where: { and: [{ startDate: { lte: currentDate } }, { endDate: { gte: currentDate } }] },
            });
            return currentTimeFrame;
        }
    }

    async updatedCronConfig(cronName: string) {
        let cronTiming = '0 */15 * * * *';
        switch (cronName) {
            case CRON_JOBS.PLAYERS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 0th second of 0th minute at 10am every tuesday
                        cronTiming = '0 0 10 * * 2';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 0th minute at 10am every tuesday
                        cronTiming = '0 0 10 * * 2';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of 0th minute of every hour of every day
                        cronTiming = '0 0 */1 */1 * *';
                        break;
                }
                break;
            case CRON_JOBS.SPECIAL_TEAMS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 0th second of 0th minute at 10am every tuesday
                        cronTiming = '0 0 10 * * 2';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 0th minute at 10am every tuesday
                        cronTiming = '0 0 10 * * 2';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of 0th minute of every hour of every day
                        cronTiming = '0 0 */1 */1 * *';
                        break;
                }
                break;
            case CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 0th second of 0th minute of every hour of every day
                        cronTiming = '0 0 */1 */1 * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 15th minute every wednesday
                        cronTiming = '0 0 3 * * 3';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of every 5th minute from 0th minute to 40th minute
                        cronTiming = '0 0-40/5 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.PLAYER_FANTASY_POINTS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 0th second of every 5 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of every 15th minute
                        cronTiming = '0 */15 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of every 5th minute from 40th minute to 50th minute
                        cronTiming = '0 40-50/5 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.WIN_CHECK_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 45th second of every 5 minutes
                        cronTiming = '45 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of every hour every tuesday
                        cronTiming = '0 0 */1 * * 2';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 45th second of every 3rd minute from 50th minute to 59th minute
                        cronTiming = '45 50-59/3 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.TIMEFRAME_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 0th second of 15th minute every wednesday
                        cronTiming = '0 15 * * * 3';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 0th minute every hour
                        cronTiming = '0 0 */1 * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of 0th minute every hour
                        cronTiming = '0 0 */1 * * *';
                        break;
                }
                break;
            case CRON_JOBS.CLOSE_CONTEST_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 9am every tuesday
                        cronTiming = '0 0 9 * * 2';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 9am every tuesday
                        cronTiming = '0 0 9 * * 2';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of 0th minute of 0th hour of every day
                        cronTiming = '0 0 0 * * *';
                        break;
                }
                break;

            case CRON_JOBS.LEAGUE_WIN_CHECK_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 45th second of every 5 minutes
                        cronTiming = '45 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of every hour every tuesday
                        cronTiming = '0 0 */1 * * 2';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 45th second of every 3rd minute from 50th minute to 59th minute
                        cronTiming = '45 50-59/3 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.YAHOO_SYNC_LEAGUES_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // Every 0th second 0th minute 6 hours
                        cronTiming = '0 0 */6 * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of every 0th and 30th minute
                        cronTiming = '0 0,30 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of every 5th minute
                        cronTiming = '0 */5 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.ESPN_SYNC_LEAGUES_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 45th second of every 5 minutes
                        cronTiming = '0 0 */6 * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of every 0th and 30th minute
                        cronTiming = '0 0,30 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of every 5th minute
                        cronTiming = '0 */5 * * * *';
                        break;
                }
                break;
        }
        return cronTiming;
    }

    async cronLogger(cronName: string) {
        let cronMessage = `default cron message from ${cronName}`;
        switch (cronName) {
            case CRON_JOBS.PLAYERS_CRON:
                cronMessage = 'Players';
                break;
            case CRON_JOBS.SPECIAL_TEAMS_CRON:
                cronMessage = 'Special Teams';
                break;
            case CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON:
                cronMessage = 'Projected Fantasy Points';
                break;
            case CRON_JOBS.PLAYER_FANTASY_POINTS_CRON:
                cronMessage = 'Player Fantasy Points';
                break;
            case CRON_JOBS.WIN_CHECK_CRON:
                cronMessage = 'Win Check';
                break;
            case CRON_JOBS.TIMEFRAME_CRON:
                cronMessage = 'Timeframe';
                break;
            case CRON_JOBS.CLOSE_CONTEST_CRON:
                cronMessage = 'Close';
                break;
            case CRON_JOBS.ESPN_SYNC_LEAGUES_CRON:
                cronMessage = 'ESPN League';
                break;
            case CRON_JOBS.YAHOO_SYNC_LEAGUES_CRON:
                cronMessage = 'Yahoo League';
                break;
        }

        console.log(chalk.green(`${cronMessage} cron finished at`, moment().format('DD-MM-YYYY hh:mm:ss a')));

        logger.info(`${cronMessage} cron finished at ` + moment().format('DD-MM-YYYY hh:mm:ss a'));
    }

    async processPlayerFantasyPoints() {
        const currentDate = await this.fetchDate();
        const remotePlayers = await this.sportsDataService.fantasyPointsByDate(currentDate);
        const localPlayers = await this.playerRepository.find();

        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        foundLocalPlayer.hasStarted = remotePlayer.HasStarted;
                        foundLocalPlayer.isOver = remotePlayer.IsOver;
                        foundLocalPlayer.fantasyPoints = remotePlayer.FantasyPoints;
                        foundLocalPlayer.fantasyPointsHalfPpr =
                            remotePlayer.FantasyPointsYahoo || remotePlayer.FantasyPointsFanDuel;
                        foundLocalPlayer.fantasyPointsFullPpr = remotePlayer.FantasyPointsPPR;
                        await this.playerRepository.save(foundLocalPlayer);
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        const today = moment().format('dddd');
                        const gameDay = moment(remotePlayer.Date).format('dddd');
                        if (today === gameDay) {
                            foundLocalPlayer.hasStarted = remotePlayer.HasStarted;
                            foundLocalPlayer.isOver = remotePlayer.IsOver;
                            foundLocalPlayer.fantasyPoints = remotePlayer.FantasyPoints;
                            foundLocalPlayer.fantasyPointsHalfPpr =
                                remotePlayer.FantasyPointsYahoo || remotePlayer.FantasyPointsFanDuel;
                            foundLocalPlayer.fantasyPointsFullPpr = remotePlayer.FantasyPointsPPR;
                            await this.playerRepository.save(foundLocalPlayer);
                        }
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        foundLocalPlayer.hasStarted = remotePlayer.HasStarted;
                        foundLocalPlayer.isOver = remotePlayer.IsOver;
                        foundLocalPlayer.fantasyPoints = remotePlayer.FantasyPoints;
                        foundLocalPlayer.fantasyPointsHalfPpr =
                            remotePlayer.FantasyPointsYahoo || remotePlayer.FantasyPointsFanDuel;
                        foundLocalPlayer.fantasyPointsFullPpr = remotePlayer.FantasyPointsPPR;
                        await this.playerRepository.save(foundLocalPlayer);
                        break;
                }
            }
        });

        return playerPromises;
    }

    async processProjectedFantasyPoints() {
        const currentDate = await this.fetchDate();
        const remotePlayers = await this.sportsDataService.projectedFantasyPointsByPlayer(currentDate);
        const localPlayers = await this.playerRepository.find();
        const ruledOutPlayer: number[] = [];
        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
                if (remotePlayer.ProjectedFantasyPoints === 0 && foundLocalPlayer.projectedFantasyPoints > 0) {
                    ruledOutPlayer.push(foundLocalPlayer.id);
                }
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        foundLocalPlayer.opponentName = remotePlayer.Opponent;
                        foundLocalPlayer.homeOrAway = remotePlayer.HomeOrAway;
                        foundLocalPlayer.projectedFantasyPoints = remotePlayer.ProjectedFantasyPoints;
                        await this.playerRepository.save(foundLocalPlayer);
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        foundLocalPlayer.hasStarted = false;
                        foundLocalPlayer.isOver = false;
                        foundLocalPlayer.opponentName = remotePlayer.Opponent;
                        foundLocalPlayer.homeOrAway = remotePlayer.HomeOrAway;
                        foundLocalPlayer.projectedFantasyPoints = remotePlayer.ProjectedFantasyPoints;
                        await this.playerRepository.save(foundLocalPlayer);
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        foundLocalPlayer.hasStarted = false;
                        foundLocalPlayer.isOver = false;
                        foundLocalPlayer.opponentName = remotePlayer.Opponent;
                        foundLocalPlayer.homeOrAway = remotePlayer.HomeOrAway;
                        foundLocalPlayer.projectedFantasyPoints = remotePlayer.ProjectedFantasyPoints;
                        await this.playerRepository.save(foundLocalPlayer);
                        break;
                }
            }
        });
        if (ruledOutPlayer.length > 0) {
            await this.leagueVoidContests(ruledOutPlayer);
        }

        return playerPromises;
    }

    async winCheck() {
        const favorite = {
            type: CONTEST_STAKEHOLDERS.PENDING,
            gameWin: false,
            coversSpread: false,
            winBonus: false,
            netEarnings: 0,
            playerWinBonus: 0,
            playerMaxWin: 0,
            playerCover: 0,
            playerSpread: 0,
            playerId: 0,
            userId: 0,
            fantasyPoints: 0,
            projectedFantasyPoints: 0,
        };

        const underdog = {
            type: CONTEST_STAKEHOLDERS.PENDING,
            gameWin: false,
            coversSpread: false,
            winBonus: false,
            netEarnings: 0,
            playerWinBonus: 0,
            playerMaxWin: 0,
            playerCover: 0,
            playerSpread: 0,
            playerId: 0,
            userId: 0,
            fantasyPoints: 0,
            projectedFantasyPoints: 0,
        };

        const contests = await this.contestRepository.find({
            where: {
                status: CONTEST_STATUSES.MATCHED,
                ended: false,
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        });

        const filteredContests = contests.filter(contest => {
            return !contest.creatorPlayer?.isOver && !contest.claimerPlayer?.isOver;
        });

        filteredContests.map(async contest => {
            const entryAmount = Number(contest.entryAmount);
            const mlValue = Number(contest.mlValue);
            const spreadValue = Number(contest.spreadValue);
            let topPropProfit = 0;
            let winner = '';

            if (contest.creatorPlayerSpread < contest.claimerPlayerSpread) {
                favorite.type = CONTEST_STAKEHOLDERS.CREATOR;
                favorite.playerWinBonus = contest.creatorPlayerWinBonus;
                favorite.playerMaxWin = contest.creatorPlayerMaxWin;
                favorite.playerCover = contest.creatorPlayerCover;
                favorite.playerSpread = contest.creatorPlayerSpread;
                favorite.userId = contest.creatorId;
                favorite.playerId = contest.creatorPlayerId;
                favorite.fantasyPoints = contest.creatorPlayer ? contest.creatorPlayer.fantasyPoints : 0;
                favorite.projectedFantasyPoints = contest.creatorPlayer
                    ? contest.creatorPlayer.projectedFantasyPoints
                    : 0;

                underdog.type = CONTEST_STAKEHOLDERS.CLAIMER;
                underdog.playerWinBonus = contest.claimerPlayerWinBonus;
                underdog.playerMaxWin = contest.claimerPlayerMaxWin;
                underdog.playerCover = contest.claimerPlayerCover;
                underdog.playerSpread = contest.claimerPlayerSpread;
                underdog.userId = contest.claimerId;
                underdog.playerId = contest.claimerPlayerId;
                underdog.fantasyPoints = contest.claimerPlayer ? contest.claimerPlayer.fantasyPoints : 0;
                underdog.projectedFantasyPoints = contest.claimerPlayer
                    ? contest.claimerPlayer.projectedFantasyPoints
                    : 0;
            } else {
                underdog.type = CONTEST_STAKEHOLDERS.CREATOR;
                underdog.playerWinBonus = contest.creatorPlayerWinBonus;
                underdog.playerMaxWin = contest.creatorPlayerMaxWin;
                underdog.playerCover = contest.creatorPlayerCover;
                underdog.playerSpread = contest.creatorPlayerSpread;
                underdog.userId = contest.creatorId;
                underdog.playerId = contest.creatorPlayerId;
                underdog.fantasyPoints = contest.creatorPlayer ? contest.creatorPlayer.fantasyPoints : 0;
                underdog.projectedFantasyPoints = contest.creatorPlayer
                    ? contest.creatorPlayer.projectedFantasyPoints
                    : 0;

                favorite.type = CONTEST_STAKEHOLDERS.CLAIMER;
                favorite.playerWinBonus = contest.claimerPlayerWinBonus;
                favorite.playerMaxWin = contest.claimerPlayerMaxWin;
                favorite.playerCover = contest.claimerPlayerCover;
                favorite.playerSpread = contest.claimerPlayerSpread;
                favorite.userId = contest.claimerId;
                favorite.playerId = contest.claimerPlayerId;
                favorite.fantasyPoints = contest.claimerPlayer ? contest.claimerPlayer.fantasyPoints : 0;
                favorite.projectedFantasyPoints = contest.claimerPlayer
                    ? contest.claimerPlayer.projectedFantasyPoints
                    : 0;
            }

            // TEST BENCH START
            // favorite.fantasyPoints = 6;
            // underdog.fantasyPoints = 2;
            // TEST BENCH END

            favorite.gameWin = favorite.fantasyPoints > underdog.fantasyPoints;
            underdog.gameWin = underdog.fantasyPoints >= favorite.fantasyPoints;

            favorite.coversSpread = favorite.fantasyPoints - underdog.playerSpread > underdog.fantasyPoints;
            underdog.coversSpread = underdog.fantasyPoints + underdog.playerSpread > favorite.fantasyPoints;

            favorite.winBonus = favorite.playerWinBonus > 0;
            underdog.winBonus = underdog.fantasyPoints > 0;

            if (favorite.gameWin && favorite.coversSpread) {
                // Row 1 & 2 of wiki combination table
                favorite.netEarnings = favorite.playerMaxWin;
                underdog.netEarnings = -entryAmount;
                topPropProfit = entryAmount - favorite.playerMaxWin;
                winner = 'favorite';
            }

            if (underdog.gameWin && underdog.coversSpread) {
                // Row 3 & 4 of wiki combination table
                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.playerMaxWin;
                topPropProfit = entryAmount - underdog.playerMaxWin;
                winner = 'underdog';
            }

            if (favorite.gameWin && !favorite.coversSpread) {
                // Row 5 & 6 of wiki combination table
                favorite.netEarnings = -entryAmount + Number(favorite.playerWinBonus) + mlValue;
                underdog.netEarnings = favorite.playerCover - mlValue;
                topPropProfit = -(underdog.netEarnings + favorite.netEarnings);
                winner = 'underdog';
            }

            if (!favorite.coversSpread && !underdog.coversSpread) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            }

            if (!favorite.gameWin && !underdog.gameWin) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            }

            if (winner === 'push') {
                const constestData = {
                    topPropProfit: topPropProfit,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                    creatorPlayerFantasyPoints: contest.creatorPlayer ? contest.creatorPlayer.fantasyPoints : 0,
                    claimerPlayerFantasyPoints: contest.claimerPlayer ? contest.claimerPlayer.fantasyPoints : 0,
                };

                await this.contestRepository.updateById(contest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = favorite.userId;
                // entryGain.contenderId = underdog.playerId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for favorite', entryGain);

                await this.gainRepository.create(entryGain);

                entryGain.amount = Number(entryAmount);
                entryGain.userId = underdog.userId;
                // entryGain.contenderId = favorite.playerId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for underdog', entryGain);

                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.contestRepository.findById(contest.id);
                const winnerUser = await this.userRepository.findById(favorite.userId);
                const winnerPlayer = await this.playerRepository.findById(favorite.playerId);
                const loserUser = await this.userRepository.findById(underdog.userId);
                const loserPlayer = await this.playerRepository.findById(underdog.playerId);
                const clientHost = process.env.CLIENT_HOST;
                let receiverUser = winnerUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                    contestData,
                    winnerUser,
                    loserUser,
                    winnerPlayer,
                    loserPlayer,
                    receiverUser,
                    text: {
                        title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                        subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                    },
                    link: {
                        url: `${clientHost}`,
                        text: `Create New Contest`,
                    },
                });
                receiverUser = loserUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                    contestData,
                    winnerUser,
                    loserUser,
                    winnerPlayer,
                    loserPlayer,
                    receiverUser,
                    text: {
                        title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                        subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                    },
                    link: {
                        url: `${clientHost}`,
                        text: `Create New Contest`,
                    },
                });
            } else {
                const winnerId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const winnerLabel = winner === 'favorite' ? favorite.type : underdog.type;
                const creatorWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? favorite.netEarnings : underdog.netEarnings;

                const claimerWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? underdog.netEarnings : favorite.netEarnings;

                const constestData = {
                    winnerId: winnerId,
                    topPropProfit: topPropProfit,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: winnerLabel,
                    creatorWinAmount: creatorWinAmount,
                    claimerWinAmount: claimerWinAmount,
                    creatorPlayerFantasyPoints: contest.creatorPlayer ? contest.creatorPlayer.fantasyPoints : 0,
                    claimerPlayerFantasyPoints: contest.claimerPlayer ? contest.claimerPlayer.fantasyPoints : 0,
                };

                await this.contestRepository.updateById(contest.id, constestData);

                const contestDataForEmail = await this.contestRepository.findById(contest.id);

                const userId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const contenderId = winner === 'favorite' ? underdog.playerId : favorite.playerId;
                const winningAmount = winner === 'favorite' ? favorite.netEarnings : underdog.netEarnings;

                const entryGain = new Gain();
                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = userId;
                // entryGain.contenderId = contenderId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Entry Amount)', entryGain);

                await this.gainRepository.create(entryGain);

                const winningGain = new Gain();
                winningGain.contestType = 'battleground';
                winningGain.amount = Number(winningAmount) * 100;
                winningGain.userId = userId;
                // winningGain.contenderId = contenderId;
                winningGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Winning Amount)', winningGain);

                await this.gainRepository.create(winningGain);
                const clientHost = process.env.CLIENT_HOST;

                if (winner === 'favorite') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(favorite.userId);
                    const winnerPlayer = await this.playerRepository.findById(favorite.playerId);
                    const loserUser = await this.userRepository.findById(underdog.userId);
                    const loserPlayer = await this.playerRepository.findById(underdog.playerId);
                    this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        c2d: MiscHelpers.c2d,
                        winAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favorite.netEarnings))}`,
                        text: {
                            title: `You Won, ${winnerUser ? winnerUser.fullName : ''}! 🚀`,
                            subtitle: ``,
                        },
                    });

                    this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(underdog.netEarnings)}`,
                        text: {
                            title: `You Lost, ${loserUser ? loserUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                } else if (winner === 'underdog') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(underdog.userId);
                    const winnerPlayer = await this.playerRepository.findById(underdog.playerId);
                    const loserUser = await this.userRepository.findById(favorite.userId);
                    const loserPlayer = await this.playerRepository.findById(favorite.playerId);
                    this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        winAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdog.netEarnings))}`,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Won, ${winnerUser ? winnerUser.fullName : ''}! 🚀`,
                            subtitle: ``,
                        },
                    });

                    this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(favorite.netEarnings)}`,
                        text: {
                            title: `You Lost, ${loserUser ? loserUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                } else {
                    //Send Draw Email
                    const contestData = contestDataForEmail;
                    const favoriteUser = await this.userRepository.findById(favorite.userId);
                    const favoritePlayer = await this.playerRepository.findById(favorite.playerId);

                    const underdogUser = await this.userRepository.findById(underdog.userId);
                    const underdogPlayer = await this.playerRepository.findById(underdog.playerId);

                    this.userService.sendEmail(favoriteUser, EMAIL_TEMPLATES.CONTEST_DRAW_FAVORITE, {
                        favoriteUser,
                        underdogUser,
                        favoritePlayer,
                        underdogPlayer,
                        contestData,
                        clientHost,
                        netEarning: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(favorite.netEarnings)}`,
                        text: {
                            title: `You Tied, ${favoriteUser ? favoriteUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });

                    this.userService.sendEmail(underdogUser, EMAIL_TEMPLATES.CONTEST_DRAW_UNDERDOG, {
                        favoriteUser,
                        underdogUser,
                        favoritePlayer,
                        underdogPlayer,
                        contestData,
                        clientHost,
                        netEarning: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(underdog.netEarnings)}`,
                        text: {
                            title: `You Tied, ${underdogUser ? underdogUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                }
            }
        });

        const contestsUnmatched = await this.contestRepository.find({
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        });

        const filteredUnclaimedContests = contestsUnmatched.filter(unclaimedContest => {
            return unclaimedContest.creatorPlayer?.isOver;
        });

        filteredUnclaimedContests.map(async unclaimedContest => {
            const constestData = {
                topPropProfit: 0,
                status: CONTEST_STATUSES.CLOSED,
                ended: true,
                endedAt: moment(),
                winnerLabel: CONTEST_STAKEHOLDERS.UNMATCHED,
                creatorWinAmount: 0,
                claimerWinAmount: 0,
                creatorPlayerFantasyPoints: 0,
                claimerPlayerFantasyPoints: 0,
            };

            await this.contestRepository.updateById(unclaimedContest.id, constestData);

            const entryGain = new Gain();
            entryGain.contestType = 'battleground';
            entryGain.amount = Number(unclaimedContest.entryAmount);
            entryGain.userId = unclaimedContest.creatorId;
            // entryGain.contenderId = unclaimedContest.creatorPlayerId;
            entryGain.contestId = unclaimedContest.id;

            await this.gainRepository.create(entryGain);

            //Send Contest Closed mail
            const contestData = await this.contestRepository.findById(unclaimedContest.id);
            const winnerUser = await this.userRepository.findById(unclaimedContest.creatorId);
            const winnerPlayer = await this.playerRepository.findById(unclaimedContest.creatorPlayerId);
            const loserUser = '';
            const loserPlayer = await this.playerRepository.findById(unclaimedContest.claimerPlayerId);
            const receiverUser = winnerUser;
            const clientHost = process.env.CLIENT_HOST;

            await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                contestData,
                winnerUser,
                loserUser,
                winnerPlayer,
                loserPlayer,
                receiverUser,
                text: {
                    title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                    subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                },
                link: {
                    url: `${clientHost}`,
                    text: `Create New Contest`,
                },
            });
        });

        return filteredUnclaimedContests ? filteredUnclaimedContests : filteredContests;
    }

    async leagueWinCheck() {
        const includes = await this.leagueService.fetchLeagueContestInclude();

        const contests = await this.leagueContestRepository.find({
            where: {
                status: CONTEST_STATUSES.MATCHED,
                ended: false,
            },
            include: includes.include,
        });

        const filteredContests = contests.filter(contest => {
            const { creatorContestTeam, claimerContestTeam, league } = contest;
            const creatorRoster = creatorContestTeam?.contestRosters;
            const claimerRoster = claimerContestTeam?.contestRosters;
            let validContest = true;
            creatorRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                }
            });
            claimerRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                }
            });

            return validContest;
        });

        filteredContests.map(async contest => {
            const favorite = {
                type: CONTEST_STAKEHOLDERS.PENDING,
                gameWin: false,
                coversSpread: false,
                winBonus: false,
                netEarnings: 0,
                teamWinBonus: 0,
                teamMaxWin: 0,
                teamCover: 0,
                teamSpread: 0,
                teamId: 0,
                userId: 0,
                fantasyPoints: 0,
                projectedFantasyPoints: 0,
            };

            const underdog = {
                type: CONTEST_STAKEHOLDERS.PENDING,
                gameWin: false,
                coversSpread: false,
                winBonus: false,
                netEarnings: 0,
                teamWinBonus: 0,
                teamMaxWin: 0,
                teamCover: 0,
                teamSpread: 0,
                teamId: 0,
                userId: 0,
                fantasyPoints: 0,
                projectedFantasyPoints: 0,
            };

            let creatorTeamFantasyPoints = 0;
            let claimerTeamFantasyPoints = 0;

            const { creatorContestTeam, claimerContestTeam, league } = contest;

            await this.savePlayerEarnedFantasyPoints(creatorContestTeam, league);
            await this.savePlayerEarnedFantasyPoints(claimerContestTeam, league);

            const creatorRoster = creatorContestTeam?.contestRosters;
            const claimerRoster = claimerContestTeam?.contestRosters;

            creatorRoster?.map(async rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                switch (league.scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        creatorTeamFantasyPoints += Number(currentPlayer.fantasyPointsHalfPpr || 0);
                        break;
                    case SCORING_TYPE.FULLPPR:
                        creatorTeamFantasyPoints += Number(currentPlayer.fantasyPointsFullPpr || 0);
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        creatorTeamFantasyPoints += Number(currentPlayer.fantasyPoints || 0);
                        break;
                }
            });

            claimerRoster?.map(async rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                switch (league.scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        claimerTeamFantasyPoints += Number(currentPlayer.fantasyPointsHalfPpr || 0);
                        break;
                    case SCORING_TYPE.FULLPPR:
                        claimerTeamFantasyPoints += Number(currentPlayer.fantasyPointsFullPpr || 0);
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        claimerTeamFantasyPoints += Number(currentPlayer.fantasyPoints || 0);
                        break;
                }
            });

            const entryAmount = Number(contest.entryAmount);
            const mlValue = Number(contest.mlValue);
            const spreadValue = Number(contest.spreadValue);
            let topPropProfit = 0;
            let winner = '';

            if (contest.creatorTeamSpread < contest.claimerTeamSpread) {
                favorite.type = CONTEST_STAKEHOLDERS.CREATOR;
                favorite.teamWinBonus = contest.creatorTeamWinBonus;
                favorite.teamMaxWin = contest.creatorTeamMaxWin;
                favorite.teamCover = contest.creatorTeamCover;
                favorite.teamSpread = contest.creatorTeamSpread;
                favorite.userId = contest.creatorId;
                favorite.teamId = contest.creatorTeamId;
                favorite.fantasyPoints = creatorTeamFantasyPoints;
                favorite.projectedFantasyPoints = contest.creatorTeamProjFantasyPoints || 0;

                underdog.type = CONTEST_STAKEHOLDERS.CLAIMER;
                underdog.teamWinBonus = contest.claimerTeamWinBonus;
                underdog.teamMaxWin = contest.claimerTeamMaxWin;
                underdog.teamCover = contest.claimerTeamCover;
                underdog.teamSpread = contest.claimerTeamSpread;
                underdog.userId = contest.claimerId;
                underdog.teamId = contest.claimerTeamId;
                underdog.fantasyPoints = claimerTeamFantasyPoints;
                underdog.projectedFantasyPoints = contest.claimerTeamProjFantasyPoints || 0;
            } else {
                underdog.type = CONTEST_STAKEHOLDERS.CREATOR;
                underdog.teamWinBonus = contest.creatorTeamWinBonus;
                underdog.teamMaxWin = contest.creatorTeamMaxWin;
                underdog.teamCover = contest.creatorTeamCover;
                underdog.teamSpread = contest.creatorTeamSpread;
                underdog.userId = contest.creatorId;
                underdog.teamId = contest.creatorTeamId;
                underdog.fantasyPoints = creatorTeamFantasyPoints;
                underdog.projectedFantasyPoints = contest.creatorTeamProjFantasyPoints || 0;

                favorite.type = CONTEST_STAKEHOLDERS.CLAIMER;
                favorite.teamWinBonus = contest.claimerTeamWinBonus;
                favorite.teamMaxWin = contest.claimerTeamMaxWin;
                favorite.teamCover = contest.claimerTeamCover;
                favorite.teamSpread = contest.claimerTeamSpread;
                favorite.userId = contest.claimerId;
                favorite.teamId = contest.claimerTeamId;
                favorite.fantasyPoints = claimerTeamFantasyPoints;
                favorite.projectedFantasyPoints = contest.claimerTeamProjFantasyPoints || 0;
            }

            // TEST BENCH START
            // favorite.fantasyPoints = 6;
            // underdog.fantasyPoints = 2;
            // TEST BENCH END

            favorite.gameWin = favorite.fantasyPoints > underdog.fantasyPoints;
            underdog.gameWin = underdog.fantasyPoints >= favorite.fantasyPoints;

            favorite.coversSpread = favorite.fantasyPoints - underdog.teamSpread > underdog.fantasyPoints;
            underdog.coversSpread = underdog.fantasyPoints + underdog.teamSpread > favorite.fantasyPoints;

            favorite.winBonus = false;
            underdog.winBonus = false;

            if (favorite.gameWin && favorite.coversSpread) {
                // Row 1 & 2 of wiki combination table
                favorite.netEarnings = favorite.teamMaxWin;
                underdog.netEarnings = -entryAmount;
                topPropProfit = entryAmount - favorite.teamMaxWin;
                winner = 'favorite';
            }

            if (underdog.gameWin && underdog.coversSpread) {
                // Row 3 & 4 of wiki combination table
                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.teamMaxWin;
                topPropProfit = entryAmount - underdog.teamMaxWin;
                winner = 'underdog';
            }

            if (favorite.gameWin && !favorite.coversSpread) {
                // Row 5 & 6 of wiki combination table
                favorite.netEarnings = -entryAmount + Number(favorite.teamWinBonus) + mlValue;
                underdog.netEarnings = favorite.teamCover - mlValue;
                topPropProfit = -(underdog.netEarnings + favorite.netEarnings);
                winner = 'underdog';
            }

            if (!favorite.coversSpread && !underdog.coversSpread) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            }

            if (!favorite.gameWin && !underdog.gameWin) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            }

            if (winner === 'push') {
                const constestData = {
                    topPropProfit: topPropProfit,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                };

                await this.leagueContestRepository.updateById(contest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = favorite.userId;
                // entryGain.contenderId = underdog.teamId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for favorite', entryGain);

                await this.gainRepository.create(entryGain);

                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = underdog.userId;
                // entryGain.contenderId = favorite.teamId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for underdog', entryGain);

                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.leagueContestRepository.findById(contest.id);

                const favoriteUser = await this.userRepository.findById(favorite.userId);
                const favoriteTeam = await this.teamRepository.findById(favorite.teamId);
                const underdogUser = await this.userRepository.findById(underdog.userId);
                const underdogTeam = await this.teamRepository.findById(underdog.teamId);

                let receiverUser = favoriteUser;
                const clientHost = process.env.CLIENT_HOST;

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                    contestData,
                    favoriteUser,
                    underdogUser,
                    favoriteTeam,
                    underdogTeam,
                    receiverUser,
                    clientHost,
                    maxWin: contestData.creatorTeamMaxWin,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `You Tied, ${receiverUser ? receiverUser.fullName : ''}!`,
                        subtitle: ``,
                    },
                });
                receiverUser = underdogUser;

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_UNDERDOG, {
                    contestData,
                    favoriteUser,
                    underdogUser,
                    favoriteTeam,
                    underdogTeam,
                    receiverUser,
                    clientHost,
                    maxWin: contestData.claimerTeamMaxWin,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `You Tied, ${receiverUser ? receiverUser.fullName : ''}!`,
                        subtitle: ``,
                    },
                });
            } else {
                const winnerId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const winnerLabel = winner === 'favorite' ? favorite.type : underdog.type;
                const creatorWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? favorite.netEarnings : underdog.netEarnings;

                const claimerWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? underdog.netEarnings : favorite.netEarnings;

                const loserTeamMaxWin = winner === 'favorite' ? underdog.teamMaxWin : favorite.teamMaxWin;
                const winnerTeamMaxWin = winner === 'favorite' ? favorite.teamMaxWin : underdog.teamMaxWin;

                const constestData = {
                    winnerId: winnerId,
                    topPropProfit: topPropProfit,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: winnerLabel,
                    creatorWinAmount: creatorWinAmount,
                    claimerWinAmount: claimerWinAmount,
                    loserTeamMaxWin: loserTeamMaxWin,
                    winnerTeamMaxWin: winnerTeamMaxWin,
                };

                await this.leagueContestRepository.updateById(contest.id, constestData);

                const contestDataForEmail = await this.leagueContestRepository.findById(contest.id);

                const userId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const contenderId = winner === 'favorite' ? underdog.teamId : favorite.teamId;
                const winningAmount = winner === 'favorite' ? favorite.netEarnings : underdog.netEarnings;

                const entryGain = new Gain();
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = userId;
                // entryGain.contenderId = contenderId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Entry Amount)', entryGain);

                await this.gainRepository.create(entryGain);

                const winningGain = new Gain();
                winningGain.contestType = 'League';
                winningGain.amount = Number(winningAmount);
                winningGain.userId = userId;
                // winningGain.contenderId = contenderId;
                winningGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Winning Amount)', winningGain);

                await this.gainRepository.create(winningGain);
                const clientHost = process.env.CLIENT_HOST;

                if (winner === 'favorite') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(favorite.userId);
                    const winnerTeam = await this.teamRepository.findById(favorite.teamId);
                    const loserUser = await this.userRepository.findById(underdog.userId);
                    const loserTeam = await this.teamRepository.findById(underdog.teamId);

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        winAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favorite.netEarnings))}`,
                        maxWin: favorite.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Won, ${winnerUser ? winnerUser.fullName : ''}! 🚀`,
                            subtitle: ``,
                        },
                    });

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdog.netEarnings))}`,
                        maxWin: underdog.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Lost, ${loserUser ? loserUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                } else if (winner === 'underdog') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(underdog.userId);
                    const winnerTeam = await this.teamRepository.findById(underdog.teamId);
                    const loserUser = await this.userRepository.findById(favorite.userId);
                    const loserTeam = await this.teamRepository.findById(favorite.teamId);

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        winAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdog.netEarnings))}`,
                        maxWin: underdog.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Won, ${winnerUser ? winnerUser.fullName : ''}! 🚀`,
                            subtitle: ``,
                        },
                    });

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favorite.netEarnings))}`,
                        maxWin: favorite.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Lost, ${loserUser ? loserUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                } else {
                    //Send Draw Email
                    const contestData = contestDataForEmail;
                    const favoriteUser = await this.userRepository.findById(favorite.userId);
                    const favoriteTeam = await this.teamRepository.findById(favorite.teamId);

                    const underdogUser = await this.userRepository.findById(underdog.userId);
                    const underdogTeam = await this.teamRepository.findById(underdog.teamId);

                    await this.userService.sendEmail(favoriteUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                        favoriteUser,
                        underdogUser,
                        favoriteTeam,
                        underdogTeam,
                        contestData,
                        clientHost,
                        netEarning: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favorite.netEarnings))}`,
                        maxWin: favorite.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Tied, ${favoriteUser ? favoriteUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });

                    await this.userService.sendEmail(underdogUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_UNDERDOG, {
                        favoriteUser,
                        underdogUser,
                        favoriteTeam,
                        underdogTeam,
                        contestData,
                        clientHost,
                        netEarning: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdog.netEarnings))}`,
                        maxWin: underdog.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Tied, ${underdogUser ? underdogUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                }
            }
        });

        // THIS LOGIC IS TO CLOSE CONTESTS WHERE ALL PLAYERS HAVE FINISHED PLAYING BUT THE CONTEST HASNT BEEN CLAIMED
        const contestsUnmatched = await this.leagueContestRepository.find({
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
            },
            include: includes.include,
        });

        const filteredUnClaimedLeagueContests = contestsUnmatched.filter(contest => {
            const { creatorContestTeam, claimerContestTeam, league } = contest;
            const creatorRoster = creatorContestTeam?.contestRosters;
            const claimerRoster = claimerContestTeam?.contestRosters;
            let validContest = true;
            creatorRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                }
            });
            claimerRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                }
            });

            return validContest;
        });

        filteredUnClaimedLeagueContests.map(async unclaimedContest => {
            const { creatorContestTeam, league } = unclaimedContest;
            await this.savePlayerEarnedFantasyPoints(creatorContestTeam, league);

            const constestData = {
                topPropProfit: 0,
                status: CONTEST_STATUSES.CLOSED,
                ended: true,
                endedAt: moment(),
                winnerLabel: CONTEST_STAKEHOLDERS.UNMATCHED,
                creatorWinAmount: 0,
                claimerWinAmount: 0,
            };

            await this.leagueContestRepository.updateById(unclaimedContest.id, constestData);

            const entryGain = new Gain();
            entryGain.contestType = 'League';
            entryGain.amount = Number(unclaimedContest.entryAmount);
            entryGain.userId = unclaimedContest.creatorId;
            // entryGain.contenderId = unclaimedContest.claimerTeamId;
            entryGain.contestId = unclaimedContest.id;

            await this.gainRepository.create(entryGain);

            //Send Contest Closed mail
            const contestData = await this.leagueContestRepository.findById(unclaimedContest.id);
            const creatorUser = await this.userRepository.findById(unclaimedContest.creatorId);
            const creatorTeam = await this.teamRepository.findById(unclaimedContest.creatorTeamId);
            const claimerUser = '';
            const claimerTeam = await this.teamRepository.findById(unclaimedContest.claimerTeamId);
            const receiverUser = creatorUser;
            const user = creatorUser;
            const clientHost = process.env.CLIENT_HOST;
            await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                contestData,
                creatorUser,
                claimerUser,
                creatorTeam,
                claimerTeam,
                receiverUser,
                maxWin: contestData.creatorTeamMaxWin,
                user,
                c2d: MiscHelpers.c2d,
                text: {
                    title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                    subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                },
                link: {
                    url: `${clientHost}`,
                    text: `Create New Contest`,
                },
            });
        });

        return filteredUnClaimedLeagueContests ? filteredUnClaimedLeagueContests : filteredContests;
    }

    async leagueCoercedWinCheck(contestIds: number[]) {
        logger.debug('League contest graded because players have isOver false', contestIds.toString());

        const includes = await this.leagueService.fetchLeagueContestInclude();

        const contests = await this.leagueContestRepository.find({
            where: {
                id: { inq: contestIds },
            },
            include: includes.include,
        });

        contests.map(async contest => {
            const favorite = {
                type: CONTEST_STAKEHOLDERS.PENDING,
                gameWin: false,
                coversSpread: false,
                winBonus: false,
                netEarnings: 0,
                teamWinBonus: 0,
                teamMaxWin: 0,
                teamCover: 0,
                teamSpread: 0,
                teamId: 0,
                userId: 0,
                fantasyPoints: 0,
                projectedFantasyPoints: 0,
            };

            const underdog = {
                type: CONTEST_STAKEHOLDERS.PENDING,
                gameWin: false,
                coversSpread: false,
                winBonus: false,
                netEarnings: 0,
                teamWinBonus: 0,
                teamMaxWin: 0,
                teamCover: 0,
                teamSpread: 0,
                teamId: 0,
                userId: 0,
                fantasyPoints: 0,
                projectedFantasyPoints: 0,
            };

            let creatorTeamFantasyPoints = 0;
            let claimerTeamFantasyPoints = 0;

            const { creatorContestTeam, claimerContestTeam, league } = contest;

            this.savePlayerEarnedFantasyPoints(creatorContestTeam, league);
            this.savePlayerEarnedFantasyPoints(claimerContestTeam, league);

            const creatorRoster = creatorContestTeam?.contestRosters;
            const claimerRoster = claimerContestTeam?.contestRosters;

            creatorRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                switch (league.scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        creatorTeamFantasyPoints += Number(currentPlayer.fantasyPointsHalfPpr || 0);
                        break;
                    case SCORING_TYPE.FULLPPR:
                        creatorTeamFantasyPoints += Number(currentPlayer.fantasyPointsFullPpr || 0);
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        creatorTeamFantasyPoints += Number(currentPlayer.fantasyPoints || 0);
                        break;
                }
            });

            claimerRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                switch (league.scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        claimerTeamFantasyPoints += Number(currentPlayer.fantasyPointsHalfPpr || 0);
                        break;
                    case SCORING_TYPE.FULLPPR:
                        claimerTeamFantasyPoints += Number(currentPlayer.fantasyPointsFullPpr || 0);
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        claimerTeamFantasyPoints += Number(currentPlayer.fantasyPoints || 0);
                        break;
                }
            });

            const entryAmount = Number(contest.entryAmount);
            const mlValue = Number(contest.mlValue);
            const spreadValue = Number(contest.spreadValue);
            let topPropProfit = 0;
            let winner = '';

            if (contest.creatorTeamSpread < contest.claimerTeamSpread) {
                favorite.type = CONTEST_STAKEHOLDERS.CREATOR;
                favorite.teamWinBonus = contest.creatorTeamWinBonus;
                favorite.teamMaxWin = contest.creatorTeamMaxWin;
                favorite.teamCover = contest.creatorTeamCover;
                favorite.teamSpread = contest.creatorTeamSpread;
                favorite.userId = contest.creatorId;
                favorite.teamId = contest.creatorTeamId;
                favorite.fantasyPoints = creatorTeamFantasyPoints;
                favorite.projectedFantasyPoints = contest.creatorTeamProjFantasyPoints || 0;

                underdog.type = CONTEST_STAKEHOLDERS.CLAIMER;
                underdog.teamWinBonus = contest.claimerTeamWinBonus;
                underdog.teamMaxWin = contest.claimerTeamMaxWin;
                underdog.teamCover = contest.claimerTeamCover;
                underdog.teamSpread = contest.claimerTeamSpread;
                underdog.userId = contest.claimerId;
                underdog.teamId = contest.claimerTeamId;
                underdog.fantasyPoints = claimerTeamFantasyPoints;
                underdog.projectedFantasyPoints = contest.claimerTeamProjFantasyPoints || 0;
            } else {
                underdog.type = CONTEST_STAKEHOLDERS.CREATOR;
                underdog.teamWinBonus = contest.creatorTeamWinBonus;
                underdog.teamMaxWin = contest.creatorTeamMaxWin;
                underdog.teamCover = contest.creatorTeamCover;
                underdog.teamSpread = contest.creatorTeamSpread;
                underdog.userId = contest.creatorId;
                underdog.teamId = contest.creatorTeamId;
                underdog.fantasyPoints = creatorTeamFantasyPoints;
                underdog.projectedFantasyPoints = contest.creatorTeamProjFantasyPoints || 0;

                favorite.type = CONTEST_STAKEHOLDERS.CLAIMER;
                favorite.teamWinBonus = contest.claimerTeamWinBonus;
                favorite.teamMaxWin = contest.claimerTeamMaxWin;
                favorite.teamCover = contest.claimerTeamCover;
                favorite.teamSpread = contest.claimerTeamSpread;
                favorite.userId = contest.claimerId;
                favorite.teamId = contest.claimerTeamId;
                favorite.fantasyPoints = claimerTeamFantasyPoints;
                favorite.projectedFantasyPoints = contest.claimerTeamProjFantasyPoints || 0;
            }

            // TEST BENCH START
            // favorite.fantasyPoints = 6;
            // underdog.fantasyPoints = 2;
            // TEST BENCH END

            favorite.gameWin = favorite.fantasyPoints > underdog.fantasyPoints;
            underdog.gameWin = underdog.fantasyPoints >= favorite.fantasyPoints;

            favorite.coversSpread = favorite.fantasyPoints - underdog.teamSpread > underdog.fantasyPoints;
            underdog.coversSpread = underdog.fantasyPoints + underdog.teamSpread > favorite.fantasyPoints;

            favorite.winBonus = false;
            underdog.winBonus = false;

            if (favorite.gameWin && favorite.coversSpread) {
                // Row 1 & 2 of wiki combination table
                favorite.netEarnings = favorite.teamMaxWin;
                underdog.netEarnings = -entryAmount;
                topPropProfit = entryAmount - favorite.teamMaxWin;
                winner = 'favorite';
            }

            if (underdog.gameWin && underdog.coversSpread) {
                // Row 3 & 4 of wiki combination table
                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.teamMaxWin;
                topPropProfit = entryAmount - underdog.teamMaxWin;
                winner = 'underdog';
            }

            if (favorite.gameWin && !favorite.coversSpread) {
                // Row 5 & 6 of wiki combination table
                favorite.netEarnings = -entryAmount + Number(favorite.teamWinBonus) + mlValue;
                underdog.netEarnings = favorite.teamCover - mlValue;
                topPropProfit = -(underdog.netEarnings + favorite.netEarnings);
                winner = 'underdog';
            }

            if (!favorite.coversSpread && !underdog.coversSpread) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            }

            if (!favorite.gameWin && !underdog.gameWin) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            }

            if (winner === 'push') {
                const constestData = {
                    topPropProfit: topPropProfit,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                };

                await this.leagueContestRepository.updateById(contest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = favorite.userId;
                // entryGain.contenderId = underdog.teamId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for favorite', entryGain);

                await this.gainRepository.create(entryGain);
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = underdog.userId;
                // entryGain.contenderId = favorite.teamId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for underdog', entryGain);

                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.leagueContestRepository.findById(contest.id);
                const favoriteUser = await this.userRepository.findById(favorite.userId);
                const favoriteTeam = await this.teamRepository.findById(favorite.teamId);
                const underdogUser = await this.userRepository.findById(underdog.userId);
                const underdogTeam = await this.teamRepository.findById(underdog.teamId);
                const clientHost = process.env.CLIENT_HOST;
                let receiverUser = favoriteUser;

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                    contestData,
                    favoriteUser,
                    underdogUser,
                    favoriteTeam,
                    underdogTeam,
                    receiverUser,
                    clientHost,
                    maxWin: contestData.creatorTeamMaxWin,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `You Tied, ${receiverUser ? receiverUser.fullName : ''}!`,
                        subtitle: ``,
                    },
                });
                receiverUser = underdogUser;

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_UNDERDOG, {
                    contestData,
                    favoriteUser,
                    underdogUser,
                    favoriteTeam,
                    underdogTeam,
                    receiverUser,
                    clientHost,
                    maxWin: contestData.claimerTeamMaxWin,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `You Tied, ${receiverUser ? receiverUser.fullName : ''}!`,
                        subtitle: ``,
                    },
                });
            } else {
                const winnerId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const winnerLabel = winner === 'favorite' ? favorite.type : underdog.type;
                const creatorWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? favorite.netEarnings : underdog.netEarnings;

                const claimerWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? underdog.netEarnings : favorite.netEarnings;

                const constestData = {
                    winnerId: winnerId,
                    topPropProfit: topPropProfit,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: winnerLabel,
                    creatorWinAmount: creatorWinAmount,
                    claimerWinAmount: claimerWinAmount,
                };

                await this.leagueContestRepository.updateById(contest.id, constestData);

                const contestDataForEmail = await this.leagueContestRepository.findById(contest.id);

                const userId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const contenderId = winner === 'favorite' ? underdog.teamId : favorite.teamId;
                const winningAmount = winner === 'favorite' ? favorite.netEarnings : underdog.netEarnings;

                const entryGain = new Gain();
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = userId;
                // entryGain.contenderId = contenderId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Entry Amount)', entryGain);

                await this.gainRepository.create(entryGain);

                const winningGain = new Gain();
                winningGain.contestType = 'League';
                winningGain.amount = Number(winningAmount) * 100;
                winningGain.userId = userId;
                // winningGain.contenderId = contenderId;
                winningGain.contestId = contest.id;
                const clientHost = process.env.CLIENT_HOST;

                // console.log('🚀 ~ gainData (Winning Amount)', winningGain);

                await this.gainRepository.create(winningGain);

                if (winner === 'favorite') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(favorite.userId);
                    const winnerTeam = await this.teamRepository.findById(favorite.teamId);
                    const loserUser = await this.userRepository.findById(underdog.userId);
                    const loserTeam = await this.teamRepository.findById(underdog.teamId);

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        winAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favorite.netEarnings))}`,
                        maxWin: favorite.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Won, ${winnerUser ? winnerUser.fullName : ''}! 🚀`,
                            subtitle: ``,
                        },
                    });

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdog.netEarnings))}`,
                        maxWin: underdog.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Lost, ${loserUser ? loserUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                } else if (winner === 'underdog') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(underdog.userId);
                    const winnerTeam = await this.teamRepository.findById(underdog.teamId);
                    const loserUser = await this.userRepository.findById(favorite.userId);
                    const loserTeam = await this.teamRepository.findById(favorite.teamId);

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        winAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdog.netEarnings))}`,
                        maxWin: underdog.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Won, ${winnerUser ? winnerUser.fullName : ''}! 🚀`,
                            subtitle: ``,
                        },
                    });

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favorite.netEarnings))}`,
                        maxWin: favorite.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Lost, ${loserUser ? loserUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                } else {
                    //Send Draw Email
                    const contestData = contestDataForEmail;
                    const favoriteUser = await this.userRepository.findById(favorite.userId);
                    const favoriteTeam = await this.teamRepository.findById(favorite.teamId);

                    const underdogUser = await this.userRepository.findById(underdog.userId);
                    const underdogTeam = await this.teamRepository.findById(underdog.teamId);

                    await this.userService.sendEmail(favoriteUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                        favoriteUser,
                        underdogUser,
                        favoriteTeam,
                        underdogTeam,
                        contestData,
                        clientHost,
                        netEarning: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favorite.netEarnings))}`,
                        maxWin: favorite.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Tied, ${favoriteUser ? favoriteUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });

                    await this.userService.sendEmail(underdogUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_UNDERDOG, {
                        favoriteUser,
                        underdogUser,
                        favoriteTeam,
                        underdogTeam,
                        contestData,
                        clientHost,
                        netEarning: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdog.netEarnings))}`,
                        maxWin: underdog.teamMaxWin,
                        c2d: MiscHelpers.c2d,
                        text: {
                            title: `You Tied, ${underdogUser ? underdogUser.fullName : ''}!`,
                            subtitle: ``,
                        },
                    });
                }
            }
        });

        const contestsUnmatched = await this.leagueContestRepository.find({
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
            },
            include: includes.include,
        });

        const filteredUnClaimedLeagueContests = contestsUnmatched.filter(contest => {
            const { creatorContestTeam, claimerContestTeam, league } = contest;
            this.savePlayerEarnedFantasyPoints(creatorContestTeam, league);
            this.savePlayerEarnedFantasyPoints(claimerContestTeam, league);

            const creatorRoster = creatorContestTeam?.contestRosters;
            const claimerRoster = claimerContestTeam?.contestRosters;
            let validContest = true;
            creatorRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                }
            });
            claimerRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                }
            });

            return validContest;
        });

        filteredUnClaimedLeagueContests.map(async unclaimedContest => {
            const constestData = {
                topPropProfit: 0,
                status: CONTEST_STATUSES.CLOSED,
                ended: true,
                endedAt: moment(),
                winnerLabel: CONTEST_STAKEHOLDERS.UNMATCHED,
                creatorWinAmount: 0,
                claimerWinAmount: 0,
            };

            await this.leagueContestRepository.updateById(unclaimedContest.id, constestData);

            const entryGain = new Gain();
            entryGain.contestType = 'League';
            entryGain.amount = Number(unclaimedContest.entryAmount);
            entryGain.userId = unclaimedContest.creatorId;
            // entryGain.contenderId = unclaimedContest.claimerTeamId;
            entryGain.contestId = unclaimedContest.id;

            await this.gainRepository.create(entryGain);

            //Send Contest Closed mail
            const contestData = await this.leagueContestRepository.findById(unclaimedContest.id);
            const creatorUser = await this.userRepository.findById(unclaimedContest.creatorId);
            const creatorTeam = await this.teamRepository.findById(unclaimedContest.creatorTeamId);
            const claimerUser = '';
            const claimerTeam = await this.teamRepository.findById(unclaimedContest.claimerTeamId);
            const receiverUser = creatorUser;
            const user = creatorUser;
            const clientHost = process.env.CLIENT_HOST;
            await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                contestData,
                creatorUser,
                claimerUser,
                creatorTeam,
                claimerTeam,
                receiverUser,
                maxWin: contestData.creatorTeamMaxWin,
                user,
                c2d: MiscHelpers.c2d,
                text: {
                    title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                    subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                },
                link: {
                    url: `${clientHost}`,
                    text: `Create New Contest`,
                },
            });
        });

        return filteredUnClaimedLeagueContests ? filteredUnClaimedLeagueContests : [];
    }

    // async voidContests(playerId: number) {
    //     const favorite = {
    //         type: CONTEST_STAKEHOLDERS.PENDING,
    //         gameWin: false,
    //         coversSpread: false,
    //         winBonus: false,
    //         netEarnings: 0,
    //         playerWinBonus: 0,
    //         playerMaxWin: 0,
    //         playerCover: 0,
    //         playerSpread: 0,
    //         playerId: 0,
    //         userId: 0,
    //         fantasyPoints: 0,
    //         projectedFantasyPoints: 0,
    //     };

    //     const underdog = {
    //         type: CONTEST_STAKEHOLDERS.PENDING,
    //         gameWin: false,
    //         coversSpread: false,
    //         winBonus: false,
    //         netEarnings: 0,
    //         playerWinBonus: 0,
    //         playerMaxWin: 0,
    //         playerCover: 0,
    //         playerSpread: 0,
    //         playerId: 0,
    //         userId: 0,
    //         fantasyPoints: 0,
    //         projectedFantasyPoints: 0,
    //     };

    //     const contests = await this.contestRepository.find({
    //         where: {
    //             status: CONTEST_STATUSES.OPEN,
    //             ended: false,
    //         },
    //         include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
    //     });

    //     contests.map(async contest => {
    //         const entryAmount = Number(contest.entryAmount);

    //         if (contest.claimerId === null) {
    //             // Unmatched
    //             const constestData = {
    //                 topPropProfit: 0,
    //                 status: CONTEST_STATUSES.CLOSED,
    //                 ended: true,
    //                 endedAt: moment(),
    //                 winnerLabel: CONTEST_STAKEHOLDERS.UNMATCHED,
    //                 creatorWinAmount: 0,
    //                 claimerWinAmount: 0,
    //             };
    //             await this.contestRepository.updateById(contest.id, constestData);

    //             const entryGain = new Gain();
    //             entryGain.amount = Number(entryAmount) * 100;
    //             entryGain.userId = favorite.userId;
    //             entryGain.contenderId = favorite.playerId;
    //             entryGain.contestId = contest.id;
    //             await this.gainRepository.create(entryGain);
    //         } else {
    //             // No data so autoclose
    //             const constestData = {
    //                 topPropProfit: 0,
    //                 status: CONTEST_STATUSES.CLOSED,
    //                 ended: true,
    //                 endedAt: moment(),
    //                 winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
    //                 creatorWinAmount: 0,
    //                 claimerWinAmount: 0,
    //             };
    //             await this.contestRepository.updateById(contest.id, constestData);

    //             const entryGain = new Gain();
    //             entryGain.amount = Number(entryAmount) * 100;
    //             entryGain.userId = favorite.userId;
    //             entryGain.contenderId = underdog.playerId;
    //             entryGain.contestId = contest.id;

    //             await this.gainRepository.create(entryGain);

    //             entryGain.amount = Number(entryAmount) * 100;
    //             entryGain.userId = underdog.userId;
    //             entryGain.contenderId = favorite.playerId;
    //             entryGain.contestId = contest.id;

    //             await this.gainRepository.create(entryGain);
    //         }
    //     });

    //     return contests;
    // }

    async closeContests() {
        const favorite = {
            type: CONTEST_STAKEHOLDERS.PENDING,
            gameWin: false,
            coversSpread: false,
            winBonus: false,
            netEarnings: 0,
            playerWinBonus: 0,
            playerMaxWin: 0,
            playerCover: 0,
            playerSpread: 0,
            playerId: 0,
            userId: 0,
            fantasyPoints: 0,
            projectedFantasyPoints: 0,
        };

        const underdog = {
            type: CONTEST_STAKEHOLDERS.PENDING,
            gameWin: false,
            coversSpread: false,
            winBonus: false,
            netEarnings: 0,
            playerWinBonus: 0,
            playerMaxWin: 0,
            playerCover: 0,
            playerSpread: 0,
            playerId: 0,
            userId: 0,
            fantasyPoints: 0,
            projectedFantasyPoints: 0,
        };

        const contests = await this.contestRepository.find({
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        });

        contests.map(async contest => {
            const entryAmount = Number(contest.entryAmount);

            if (contest.claimerId === null) {
                // Unmatched
                const constestData = {
                    topPropProfit: 0,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.UNMATCHED,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                };
                await this.contestRepository.updateById(contest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = favorite.userId;
                // entryGain.contenderId = favorite.playerId;
                entryGain.contestId = contest.id;
                await this.gainRepository.create(entryGain);
            } else {
                // No data so autoclose
                const constestData = {
                    topPropProfit: 0,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                };
                await this.contestRepository.updateById(contest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = favorite.userId;
                // entryGain.contenderId = underdog.playerId;
                entryGain.contestId = contest.id;

                await this.gainRepository.create(entryGain);

                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = underdog.userId;
                // entryGain.contenderId = favorite.playerId;
                entryGain.contestId = contest.id;

                await this.gainRepository.create(entryGain);
            }
        });

        return contests;
    }

    async fetchTimeframes() {
        const remoteTimeframes = await this.sportsDataService.timeFrames(TIMEFRAMES.ALL);
        const localTimeframes = await this.timeframeRepository.find();
        const timeframePromises = remoteTimeframes.map(async remoteTimeframe => {
            const foundLocalTimeframe = localTimeframes.find(localTimeframe => {
                return moment(remoteTimeframe.StartDate).isSame(localTimeframe.startDate);
            });
            if (!foundLocalTimeframe) {
                const newTimeframe = new Timeframe();
                newTimeframe.seasonType = remoteTimeframe.SeasonType;
                newTimeframe.season = remoteTimeframe.Season;
                newTimeframe.week = remoteTimeframe.Week;
                newTimeframe.name = remoteTimeframe.Name;
                newTimeframe.shortName = remoteTimeframe.ShortName;
                newTimeframe.startDate = remoteTimeframe.StartDate;
                newTimeframe.endDate = remoteTimeframe.EndDate;
                newTimeframe.firstGameStart = remoteTimeframe.FirstGameStart;
                newTimeframe.firstGameEnd = remoteTimeframe.FirstGameEnd;
                newTimeframe.lastGameEnd = remoteTimeframe.LastGameEnd;
                newTimeframe.hasGames = remoteTimeframe.HasGames;
                newTimeframe.hasStarted = remoteTimeframe.HasStarted;
                newTimeframe.hasEnded = remoteTimeframe.HasEnded;
                newTimeframe.hasFirstGameStarted = remoteTimeframe.HasFirstGameStarted;
                newTimeframe.hasFirstGameEnded = remoteTimeframe.HasFirstGameEnded;
                newTimeframe.hasLastGameEnded = remoteTimeframe.HasLastGameEnded;
                newTimeframe.apiSeason = remoteTimeframe.ApiSeason;
                newTimeframe.apiWeek = remoteTimeframe.ApiWeek;
                await this.timeframeRepository.create(newTimeframe);
            }
        });

        return timeframePromises;
    }

    async fetchPlayers() {
        //Read espn_playerid.csv file which contains the mapping between sportsdata player id and espn player id.
        //This sheet is provided by sports data. In future, when new players will be added, sportsdata should provide us this csv again with updated data.
        const readFile = util.promisify(fs.readFile);
        let records: any[] = [];
        try {
            const data = await readFile('src/seeders/espn_playerid.csv', 'utf8');
            records = parse(data, {
                columns: true,
                skip_empty_lines: true,
            });
        } catch (err) {
            logger.error(err);
        }
        const remotePlayers = await this.sportsDataService.availablePlayers();
        const localPlayers = await this.playerRepository.find();
        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            const highResRemotePlayerPhotoUrl = remotePlayer.PhotoUrl.replace('low-res', 'studio-high-res');
            if (foundLocalPlayer) {
                foundLocalPlayer.photoUrl = remotePlayer.PhotoUrl;
                foundLocalPlayer.photoUrlHiRes = highResRemotePlayerPhotoUrl;
                foundLocalPlayer.status = remotePlayer.Status;
                foundLocalPlayer.available = remotePlayer.Active;
                foundLocalPlayer.teamName = remotePlayer.Team;
                foundLocalPlayer.playerType = 1; // Regular Player
                foundLocalPlayer.yahooPlayerId = remotePlayer.YahooPlayerID;
                if (records.some(record => record.PlayerID === `${foundLocalPlayer.remoteId}`)) {
                    const record = records.find(record => record.PlayerID === `${foundLocalPlayer.remoteId}`);
                    if (record.EspnPlayerID.trim() !== '') {
                        foundLocalPlayer.espnPlayerId = record.EspnPlayerID;
                    }
                }
                await this.playerRepository.save(foundLocalPlayer);
            } else {
                const newLocalPlayer = new Player();
                newLocalPlayer.remoteId = remotePlayer.PlayerID;
                newLocalPlayer.photoUrl = remotePlayer.PhotoUrl;
                newLocalPlayer.photoUrlHiRes = highResRemotePlayerPhotoUrl;
                newLocalPlayer.firstName = remotePlayer.FirstName;
                newLocalPlayer.lastName = remotePlayer.LastName;
                newLocalPlayer.fullName = `${remotePlayer.FirstName} ${remotePlayer.LastName}`;
                newLocalPlayer.shortName = remotePlayer.ShortName;
                newLocalPlayer.status = remotePlayer.Status;
                newLocalPlayer.available = remotePlayer.Active;
                newLocalPlayer.position = remotePlayer.Position;
                newLocalPlayer.teamName = remotePlayer.Team;
                newLocalPlayer.teamId = remotePlayer.TeamID;
                newLocalPlayer.playerType = 1; // Regular Player
                newLocalPlayer.yahooPlayerId = remotePlayer.YahooPlayerID;
                if (records.some(record => record.PlayerID === `${newLocalPlayer.remoteId}`)) {
                    const record = records.find(record => record.PlayerID === `${newLocalPlayer.remoteId}`);
                    if (record.EspnPlayerID.trim() !== '') {
                        newLocalPlayer.espnPlayerId = record.EspnPlayerID;
                    }
                }
                await this.playerRepository.create(newLocalPlayer);
            }
        });

        return playerPromises;
    }

    async fetchSpecialTeams() {
        const remoteTeams = await this.sportsDataService.activeTeams();
        const localPlayers = await this.playerRepository.find();
        const teamPromises = remoteTeams.map(async remoteTeam => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remoteTeam.PlayerID === localPlayer.remoteId);
            // const highResRemotePlayerPhotoUrl = remotePlayer.PhotoUrl.replace('low-res', 'studio-high-res');
            if (foundLocalPlayer) {
                foundLocalPlayer.photoUrl = remoteTeam.WikipediaLogoUrl;
                foundLocalPlayer.photoUrlHiRes = remoteTeam.WikipediaLogoUrl;
                foundLocalPlayer.status = 'Active';
                foundLocalPlayer.available = true;
                foundLocalPlayer.teamName = remoteTeam.Key;
                foundLocalPlayer.playerType = 2; // Special Team Player
                const record = DST_IDS.find(record => record.sportsdataplayerid === foundLocalPlayer.remoteId);
                if (record) {
                    foundLocalPlayer.yahooPlayerId = record.yahooplayerid;
                    foundLocalPlayer.espnPlayerId = record.espnplayerid;
                }
                await this.playerRepository.save(foundLocalPlayer);
            } else {
                const newLocalPlayer = new Player();
                newLocalPlayer.remoteId = remoteTeam.PlayerID;
                newLocalPlayer.photoUrl = remoteTeam.WikipediaLogoUrl;
                newLocalPlayer.photoUrlHiRes = remoteTeam.WikipediaLogoUrl;
                newLocalPlayer.firstName = remoteTeam.City;
                newLocalPlayer.lastName = remoteTeam.Name;
                newLocalPlayer.fullName = remoteTeam.FullName;
                newLocalPlayer.shortName = remoteTeam.Key;
                newLocalPlayer.status = 'Active';
                newLocalPlayer.available = true;
                newLocalPlayer.position = 'DEF';
                newLocalPlayer.teamName = remoteTeam.Key;
                newLocalPlayer.teamId = remoteTeam.TeamID;
                newLocalPlayer.playerType = 2; // Special Team Player
                const record = DST_IDS.find(record => record.sportsdataplayerid === newLocalPlayer.remoteId);
                if (record) {
                    newLocalPlayer.yahooPlayerId = record.yahooplayerid;
                    newLocalPlayer.espnPlayerId = record.espnplayerid;
                }
                await this.playerRepository.create(newLocalPlayer);
            }
        });

        return teamPromises;
    }

    async leagueCloseContests() {
        const includes = await this.leagueService.fetchLeagueContestInclude();

        const contestsUnclaimed = await this.leagueContestRepository.find({
            where: {
                or: [{ status: CONTEST_STATUSES.OPEN }, { status: CONTEST_STATUSES.MATCHED }],
                ended: false,
            },
            include: includes.include,
        });

        const coercedLeagueContests: number[] = [];

        contestsUnclaimed.map(async unclaimedContest => {
            const entryAmount = Number(unclaimedContest.entryAmount);

            if (unclaimedContest.claimerId === null) {
                const { creatorContestTeam, league } = unclaimedContest;

                this.savePlayerEarnedFantasyPoints(creatorContestTeam, league);

                // Unmatched
                const constestData = {
                    topPropProfit: 0,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.UNMATCHED,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                };
                await this.leagueContestRepository.updateById(unclaimedContest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = unclaimedContest.creatorId;
                // entryGain.contenderId = unclaimedContest.creatorTeamId;
                entryGain.contestId = unclaimedContest.id;
                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.leagueContestRepository.findById(unclaimedContest.id);
                const creatorUser = await this.userRepository.findById(unclaimedContest.creatorId);
                const creatorTeam = await this.teamRepository.findById(unclaimedContest.creatorTeamId);
                const claimerUser = '';
                const claimerTeam = await this.teamRepository.findById(unclaimedContest.claimerTeamId);
                const receiverUser = creatorUser;
                const user = creatorUser;
                const clientHost = process.env.CLIENT_HOST;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                    contestData,
                    creatorUser,
                    claimerUser,
                    creatorTeam,
                    claimerTeam,
                    receiverUser,
                    maxWin: contestData.creatorTeamMaxWin,
                    user,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                        subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                    },
                    link: {
                        url: `${clientHost}`,
                        text: `Create New Contest`,
                    },
                });
            } else {
                // No data so auto-close
                coercedLeagueContests.push(unclaimedContest.id);
            }
        });

        if (coercedLeagueContests.length > 0) {
            await this.leagueCoercedWinCheck(coercedLeagueContests);
        }

        return contestsUnclaimed;
    }

    async leagueVoidContests(playerIds: number[]) {
        logger.debug('League contest voided because players are ruled out', playerIds.toString());
        const includes = await this.leagueService.fetchLeagueContestInclude();

        const contests = await this.leagueContestRepository.find({
            where: {
                or: [{ status: CONTEST_STATUSES.OPEN }, { status: CONTEST_STATUSES.MATCHED }],
                ended: false,
            },
            include: includes.include,
        });

        const filteredContests = await Promise.all(
            contests.filter(async contest => {
                const { creatorContestTeam, claimerContestTeam, league } = contest;

                this.savePlayerEarnedFantasyPoints(creatorContestTeam, league);
                this.savePlayerEarnedFantasyPoints(claimerContestTeam, league);

                const creatorRoster = creatorContestTeam?.contestRosters || [];
                const claimerRoster = claimerContestTeam?.contestRosters || [];
                let voidContest = false;
                await Promise.all(
                    creatorRoster.map(async rosterEntry => {
                        //@ts-ignore
                        const currentPlayer = rosterEntry?.player;
                        if (playerIds.includes(currentPlayer.id)) {
                            voidContest = true;
                        }
                    }),
                );

                await Promise.all(
                    claimerRoster.map(async rosterEntry => {
                        //@ts-ignore
                        const currentPlayer = rosterEntry?.player;
                        if (playerIds.includes(currentPlayer.id)) {
                            voidContest = true;
                        }
                    }),
                );
                return voidContest;
            }),
        );

        filteredContests.map(async unclaimedContest => {
            const entryAmount = Number(unclaimedContest.entryAmount);

            if (unclaimedContest.claimerId === null) {
                // Unmatched
                const constestData = {
                    topPropProfit: 0,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.UNMATCHED,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                };
                await this.leagueContestRepository.updateById(unclaimedContest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = unclaimedContest.creatorId;
                // entryGain.contenderId = unclaimedContest.creatorTeamId;
                entryGain.contestId = unclaimedContest.id;
                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.leagueContestRepository.findById(unclaimedContest.id);
                const creatorUser = await this.userRepository.findById(unclaimedContest.creatorId);
                const creatorTeam = await this.teamRepository.findById(unclaimedContest.creatorTeamId);
                const claimerUser = '';
                const claimerTeam = await this.teamRepository.findById(unclaimedContest.claimerTeamId);
                const receiverUser = creatorUser;
                const user = creatorUser;
                const clientHost = process.env.CLIENT_HOST;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                    contestData,
                    creatorUser,
                    claimerUser,
                    creatorTeam,
                    claimerTeam,
                    receiverUser,
                    maxWin: contestData.creatorTeamMaxWin,
                    user,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                        subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                    },
                    link: {
                        url: `${clientHost}`,
                        text: `Create New Contest`,
                    },
                });
            } else {
                // No data so auto-close
                const constestData = {
                    topPropProfit: 0,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
                    creatorWinAmount: 0,
                    claimerWinAmount: 0,
                };
                await this.leagueContestRepository.updateById(unclaimedContest.id, constestData);

                const entryGain = new Gain();
                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = unclaimedContest.creatorId;
                // entryGain.contenderId = unclaimedContest.claimerId;
                entryGain.contestId = unclaimedContest.id;

                await this.gainRepository.create(entryGain);

                entryGain.contestType = 'League';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = unclaimedContest.claimerId;
                // entryGain.contenderId = unclaimedContest.creatorId;
                entryGain.contestId = unclaimedContest.id;

                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.leagueContestRepository.findById(unclaimedContest.id);
                const creatorUser = await this.userRepository.findById(unclaimedContest.creatorId);
                const creatorTeam = await this.teamRepository.findById(unclaimedContest.creatorTeamId);
                const claimerUser = await this.userRepository.findById(unclaimedContest.claimerId);
                const claimerTeam = await this.teamRepository.findById(unclaimedContest.claimerTeamId);
                const clientHost = process.env.CLIENT_HOST;
                let receiverUser = creatorUser;
                let user = creatorUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                    contestData,
                    creatorUser,
                    claimerUser,
                    creatorTeam,
                    claimerTeam,
                    receiverUser,
                    maxWin: contestData.creatorTeamMaxWin,
                    user,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                        subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                    },
                    link: {
                        url: `${clientHost}`,
                        text: `Create New Contest`,
                    },
                });

                receiverUser = claimerUser;
                user = claimerUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                    contestData,
                    creatorUser,
                    claimerUser,
                    creatorTeam,
                    claimerTeam,
                    receiverUser,
                    maxWin: contestData.claimerTeamMaxWin,
                    user,
                    c2d: MiscHelpers.c2d,
                    text: {
                        title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
                        subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
                    },
                    link: {
                        url: `${clientHost}`,
                        text: `Create New Contest`,
                    },
                });
            }
        });
        logger.debug('League contests voided', JSON.stringify(filteredContests));
        return filteredContests;
    }

    async savePlayerEarnedFantasyPoints(contestTeam: any, league: any) {
        const teamRoster = contestTeam?.contestRosters;
        teamRoster?.map(async (rosterEntry: any) => {
            //@ts-ignore
            const currentPlayer = rosterEntry?.player;
            let rosterPlayerFantasyPoints = 0;
            switch (league.scoringTypeId) {
                case SCORING_TYPE.HALFPPR:
                    rosterPlayerFantasyPoints = Number(currentPlayer.fantasyPointsHalfPpr || 0);
                    break;
                case SCORING_TYPE.FULLPPR:
                    rosterPlayerFantasyPoints = Number(currentPlayer.fantasyPointsFullPpr || 0);
                    break;
                case SCORING_TYPE.NOPPR:
                    // Standard PPR
                    rosterPlayerFantasyPoints = Number(currentPlayer.fantasyPoints || 0);
                    break;
            }
            const contestRosterData = {
                playerFantasyPoints: rosterPlayerFantasyPoints,
            };

            return this.contestRosterRepository.updateById(rosterEntry.id, contestRosterData);
        });
    }

    async syncESPNLeagues() {
        const existingLeagues = await this.leagueRepository.find({
            where: {
                importSourceId: 1,
            },
        });
        //ESPN sync
        const espnLeagues = existingLeagues.filter(league => {
            return league.importSourceId === 1;
        });

        espnLeagues.map(async league => {
            await this.leagueService.resyncESPN(league.id);
            await sleep(30000);
        });
        const updatedEspnLeagues = await this.leagueRepository.find({
            where: {
                importSourceId: 2,
            },
        });

        return existingLeagues;
    }

    async syncYahooLeagues() {
        const existingLeagues = await this.leagueRepository.find({
            where: {
                importSourceId: 2,
            },
        });

        //Yahoo sync
        const yahooLeagues = existingLeagues.filter(league => {
            return league.importSourceId === 2;
        });

        yahooLeagues.map(async league => {
            await this.leagueService.resyncYahoo(league.id);
            await sleep(1000);
        });
        const updatedYahooLeagues = await this.leagueRepository.find({
            where: {
                importSourceId: 2,
            },
        });
    }
}
