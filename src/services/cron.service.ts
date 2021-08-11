import {BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Gain, Player, Timeframe} from '@src/models';
import {
    ContestRepository,
    ContestRosterRepository,
    GainRepository,
    LeagueContestRepository,
    LeagueRepository,
    PlayerRepository,

    RosterRepository, TeamRepository, TimeframeRepository,
    UserRepository
} from '@src/repositories';
import {SportsDataService, UserService} from '@src/services';
import chalk from 'chalk';
import moment from 'moment';
import {LeagueService} from '../services/league.service';
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
    RUN_TYPE, SCORING_TYPE, TIMEFRAMES
} from '../utils/constants';


const logger = require('../utils/logger');
const sleep = require('../utils/sleep');

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
                        // 0th second of 0th minute every wednesday
                        cronTiming = '0 0 * * * 3';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 0th minute every wednesday
                        cronTiming = '0 0 * * * 3';
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
                        // 0th second of 0th minute every wednesday
                        cronTiming = '0 0 * * * 3';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 0th minute every wednesday
                        cronTiming = '0 0 * * * 3';
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
                        cronTiming = '0 15 * * * 3';
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
                        // 0th second of 1st minute every wednesday
                        cronTiming = '0 1 * * * 3';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 1st minute every wednesday
                        cronTiming = '0 1 * * * 3';
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
        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
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
                };

                await this.contestRepository.updateById(contest.id, constestData);

                const entryGain = new Gain();

                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = favorite.userId;
                entryGain.contenderId = underdog.playerId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for favorite', entryGain);

                await this.gainRepository.create(entryGain);

                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = underdog.userId;
                entryGain.contenderId = favorite.playerId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for underdog', entryGain);

                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.contestRepository.findById(contest.id);
                const winnerUser = await this.userRepository.findById(favorite.userId);
                const winnerPlayer = await this.playerRepository.findById(favorite.playerId);
                const loserUser = await this.userRepository.findById(underdog.userId);
                const loserPlayer = await this.playerRepository.findById(underdog.playerId);
                let receiverUser = winnerUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                    contestData,
                    winnerUser,
                    loserUser,
                    winnerPlayer,
                    loserPlayer,
                    receiverUser,
                    text: {
                        title: 'Contest Closed',
                        subtitle: `Your contest has been closed`,
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
                        title: 'Contest Closed',
                        subtitle: `Your contest has been closed`,
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

                await this.contestRepository.updateById(contest.id, constestData);

                const contestDataForEmail = await this.contestRepository.findById(contest.id);

                const userId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const contenderId = winner === 'favorite' ? underdog.playerId : favorite.playerId;
                const winningAmount = winner === 'favorite' ? favorite.netEarnings : underdog.netEarnings;

                const entryGain = new Gain();

                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = userId;
                entryGain.contenderId = contenderId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Entry Amount)', entryGain);

                await this.gainRepository.create(entryGain);

                const winningGain = new Gain();

                winningGain.amount = Number(winningAmount) * 100;
                winningGain.userId = userId;
                winningGain.contenderId = contenderId;
                winningGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Winning Amount)', winningGain);

                await this.gainRepository.create(winningGain);

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
                        text: {
                            title: 'Contest Won',
                            subtitle: `Congratulations, You have won the contest. Your net earnings are ${new Intl.NumberFormat(
                                'en-US',
                                {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                },
                            ).format(favorite.netEarnings)}`,
                        },
                    });

                    this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        text: {
                            title: 'Contest Lost',
                            subtitle: `Sorry, You have lost the contest. Your net earnings are
                                ${new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                }).format(underdog.netEarnings)}`,
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
                        text: {
                            title: 'Contest Won',
                            subtitle: `Congratulations, You have won the contest. Your net earnings are ${new Intl.NumberFormat(
                                'en-US',
                                {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                },
                            ).format(underdog.netEarnings)}`,
                        },
                    });

                    this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        text: {
                            title: 'Contest Lost',
                            subtitle: `Sorry, You have lost the contest. Your net earnings are ${new Intl.NumberFormat(
                                'en-US',
                                {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                },
                            ).format(favorite.netEarnings)}`,
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
                        text: {
                            title: 'Contest was a push',
                            subtitle: `Your contest was a draw. Your net earnings are ${new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            }).format(favorite.netEarnings)}`,
                        },
                    });

                    this.userService.sendEmail(underdogUser, EMAIL_TEMPLATES.CONTEST_DRAW_UNDERDOG, {
                        favoriteUser,
                        underdogUser,
                        favoritePlayer,
                        underdogPlayer,
                        contestData,
                        text: {
                            title: 'Contest was a push',
                            subtitle: `Your contest was a draw. Your net earnings are ${new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            }).format(underdog.netEarnings)}`,
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
            };

            await this.contestRepository.updateById(unclaimedContest.id, constestData);

            const entryGain = new Gain();

            entryGain.amount = Number(unclaimedContest.entryAmount) * 100;
            entryGain.userId = unclaimedContest.creatorId;
            entryGain.contenderId = unclaimedContest.creatorPlayerId;
            entryGain.contestId = unclaimedContest.id;

            await this.gainRepository.create(entryGain);

            //Send Contest Closed mail
            const contestData = await this.contestRepository.findById(unclaimedContest.id);
            const winnerUser = await this.userRepository.findById(unclaimedContest.creatorId);
            const winnerPlayer = await this.playerRepository.findById(unclaimedContest.creatorPlayerId);
            const loserUser = '';
            const loserPlayer = await this.playerRepository.findById(unclaimedContest.claimerPlayerId);
            const receiverUser = winnerUser;
            await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                contestData,
                winnerUser,
                loserUser,
                winnerPlayer,
                loserPlayer,
                receiverUser,
                text: {
                    title: 'Contest Closed',
                    subtitle: `Your contest has been closed`,
                },
            });
        });

        return filteredUnclaimedContests ? filteredUnclaimedContests : filteredContests;
    }

    async leagueWinCheck() {
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

        const includes = await this.leagueService.fetchLeagueContestInclude();

        const contests = await this.leagueContestRepository.find({
            where: {
                status: CONTEST_STATUSES.MATCHED,
                ended: false,
            },
            include: includes.include,
        });

        let creatorTeamFantasyPoints = 0;
        let claimerTeamFantasyPoints = 0;

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
                } else {
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
                }
            });
            claimerRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                } else {
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
                }
            });

            return validContest;
        });

        console.log(
            '🚀 ~ file: cron.service.ts ~ line 865 ~ CronService ~ leagueWinCheck ~ filteredContests',
            filteredContests,
        );

        filteredContests.map(async contest => {
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

                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = favorite.userId;
                entryGain.contenderId = underdog.teamId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for favorite', entryGain);

                await this.gainRepository.create(entryGain);

                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = underdog.userId;
                entryGain.contenderId = favorite.teamId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ refund data for underdog', entryGain);

                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const contestData = await this.leagueContestRepository.findById(contest.id);
                const winnerUser = await this.userRepository.findById(favorite.userId);
                const winnerTeam = await this.teamRepository.findById(favorite.teamId);
                const loserUser = await this.userRepository.findById(underdog.userId);
                const loserTeam = await this.teamRepository.findById(underdog.teamId);
                let receiverUser = winnerUser;
                // TODO
                // await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                //     contestData,
                //     winnerUser,
                //     loserUser,
                //     winnerTeam,
                //     loserTeam,
                //     receiverUser,
                //     text: {
                //         title: 'League Contest Closed',
                //         subtitle: `Your contest has been closed`,
                //     },
                // });
                receiverUser = loserUser;
                // TODO
                // await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                //     contestData,
                //     winnerUser,
                //     loserUser,
                //     winnerTeam,
                //     loserTeam,
                //     receiverUser,
                //     text: {
                //         title: 'League Contest Closed',
                //         subtitle: `Your contest has been closed`,
                //     },
                // });
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

                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = userId;
                entryGain.contenderId = contenderId;
                entryGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Entry Amount)', entryGain);

                await this.gainRepository.create(entryGain);

                const winningGain = new Gain();

                winningGain.amount = Number(winningAmount) * 100;
                winningGain.userId = userId;
                winningGain.contenderId = contenderId;
                winningGain.contestId = contest.id;

                // console.log('🚀 ~ gainData (Winning Amount)', winningGain);

                await this.gainRepository.create(winningGain);

                if (winner === 'favorite') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(favorite.userId);
                    const winnerTeam = await this.teamRepository.findById(favorite.teamId);
                    const loserUser = await this.userRepository.findById(underdog.userId);
                    const loserTeam = await this.teamRepository.findById(underdog.teamId);
                    // TODO
                    // this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                    //     winnerUser,
                    //     loserUser,
                    //     winnerPlayer,
                    //     loserPlayer,
                    //     contestData,
                    //     netEarnings: favorite.netEarnings,
                    //     text: {
                    //         title: 'League Contest Won',
                    //         subtitle: `Congratulations, You have won the league contest. Your net earnings are ${new Intl.NumberFormat(
                    //             'en-US',
                    //             {
                    //                 style: 'currency',
                    //                 currency: 'USD',
                    //                 minimumFractionDigits: 2,
                    //                 maximumFractionDigits: 2,
                    //             },
                    //         ).format(favorite.netEarnings)}`,
                    //     },
                    // });

                    // TODO
                    // this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                    //     winnerUser,
                    //     loserUser,
                    //     winnerPlayer,
                    //     loserPlayer,
                    //     contestData,
                    //     netEarnings: underdog.netEarnings,
                    //     text: {
                    //         title: 'League Contest Lost',
                    //         subtitle: `Sorry, You have lost the league contest. Your net earnings are
                    //                     ${new Intl.NumberFormat('en-US', {
                    //                         style: 'currency',
                    //                         currency: 'USD',
                    //                         minimumFractionDigits: 2,
                    //                         maximumFractionDigits: 2,
                    //                     }).format(underdog.netEarnings)}`,
                    //     },
                    // });
                } else if (winner === 'underdog') {
                    const contestData = contestDataForEmail;
                    const winnerUser = await this.userRepository.findById(underdog.userId);
                    const winnerTeam = await this.teamRepository.findById(underdog.teamId);
                    const loserUser = await this.userRepository.findById(favorite.userId);
                    const loserTeam = await this.teamRepository.findById(favorite.teamId);

                    // TODO
                    // this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                    //     winnerUser,
                    //     loserUser,
                    //     winnerPlayer,
                    //     loserPlayer,
                    //     contestData,
                    //     netEarnings: underdog.netEarnings,
                    //     text: {
                    //         title: 'League Contest Won',
                    //         subtitle: `Congratulations, You have won the league contest. Your net earnings are ${new Intl.NumberFormat(
                    //             'en-US',
                    //             {
                    //                 style: 'currency',
                    //                 currency: 'USD',
                    //                 minimumFractionDigits: 2,
                    //                 maximumFractionDigits: 2,
                    //             },
                    //         ).format(underdog.netEarnings)}`,
                    //     },
                    // });

                    // TODO
                    // this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                    //     winnerUser,
                    //     loserUser,
                    //     winnerPlayer,
                    //     loserPlayer,
                    //     contestData,
                    //     netEarnings: favorite.netEarnings,
                    //     text: {
                    //         title: 'League Contest Lost',
                    //         subtitle: `Sorry, You have lost the league contest. Your net earnings are ${new Intl.NumberFormat(
                    //             'en-US',
                    //             {
                    //                 style: 'currency',
                    //                 currency: 'USD',
                    //                 minimumFractionDigits: 2,
                    //                 maximumFractionDigits: 2,
                    //             },
                    //         ).format(favorite.netEarnings)}`,
                    //     },
                    // });
                } else {
                    //Send Draw Email
                    const contestData = contestDataForEmail;
                    const favoriteUser = await this.userRepository.findById(favorite.userId);
                    const favoriteTeam = await this.teamRepository.findById(favorite.teamId);

                    const underdogUser = await this.userRepository.findById(underdog.userId);
                    const underdogTeam = await this.teamRepository.findById(underdog.teamId);

                    // TODO
                    // this.userService.sendEmail(favoriteUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                    //     favoriteUser,
                    //     underdogUser,
                    //     favoritePlayer,
                    //     underdogPlayer,
                    //     contestData,
                    //     text: {
                    //         title: 'League Contest was a push',
                    //         subtitle: `Your league contest was a draw. Your net earnings are ${new Intl.NumberFormat(
                    //             'en-US',
                    //             {
                    //                 style: 'currency',
                    //                 currency: 'USD',
                    //                 minimumFractionDigits: 2,
                    //                 maximumFractionDigits: 2,
                    //             },
                    //         ).format(favorite.netEarnings)}`,
                    //     },
                    // });

                    // TODO
                    // this.userService.sendEmail(underdogUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_UNDERDOG, {
                    //     favoriteUser,
                    //     underdogUser,
                    //     favoritePlayer,
                    //     underdogPlayer,
                    //     contestData,
                    //     text: {
                    //         title: 'League Contest was a push',
                    //         subtitle: `Your league contest was a draw. Your net earnings are ${new Intl.NumberFormat(
                    //             'en-US',
                    //             {
                    //                 style: 'currency',
                    //                 currency: 'USD',
                    //                 minimumFractionDigits: 2,
                    //                 maximumFractionDigits: 2,
                    //             },
                    //         ).format(underdog.netEarnings)}`,
                    //     },
                    // });
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
            const creatorRoster = creatorContestTeam?.contestRosters;
            const claimerRoster = claimerContestTeam?.contestRosters;
            let validContest = true;
            creatorRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                } else {
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
                }
            });
            claimerRoster?.map(rosterEntry => {
                //@ts-ignore
                const currentPlayer = rosterEntry?.player;
                if (currentPlayer.isOver === false) {
                    validContest = false;
                } else {
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

            entryGain.amount = Number(unclaimedContest.entryAmount) * 100;
            entryGain.userId = unclaimedContest.creatorId;
            entryGain.contenderId = unclaimedContest.claimerTeamId;
            entryGain.contestId = unclaimedContest.id;

            await this.gainRepository.create(entryGain);

            //Send Contest Closed mail
            const contestData = await this.leagueContestRepository.findById(unclaimedContest.id);
            const winnerUser = await this.userRepository.findById(unclaimedContest.creatorId);
            const winnerTeam = await this.teamRepository.findById(unclaimedContest.creatorTeamId);
            const loserUser = '';
            const loserTeam = await this.teamRepository.findById(unclaimedContest.claimerTeamId);
            const receiverUser = winnerUser;
            // await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
            //     contestData,
            //     winnerUser,
            //     loserUser,
            //     winnerPlayer,
            //     loserPlayer,
            //     receiverUser,
            //     text: {
            //         title: 'League Contest Closed',
            //         subtitle: `Your league contest has been closed`,
            //     },
            // });
        });

        return filteredUnClaimedLeagueContests ? filteredUnClaimedLeagueContests : filteredContests;
    }

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
                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = favorite.userId;
                entryGain.contenderId = favorite.playerId;
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
                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = favorite.userId;
                entryGain.contenderId = underdog.playerId;
                entryGain.contestId = contest.id;

                await this.gainRepository.create(entryGain);

                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = underdog.userId;
                entryGain.contenderId = favorite.playerId;
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
                foundLocalPlayer.playerType = 2; // Regular Player
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
                await this.playerRepository.create(newLocalPlayer);
            }
        });

        return teamPromises;
    }

    async leagueCloseContests() {

        const includes = await this.leagueService.fetchLeagueContestInclude();

        const contestsUnclaimed = await this.leagueContestRepository.find({
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
            },
            include: includes.include,
        });


        contestsUnclaimed.map(async unclaimedContest => {
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
                entryGain.contestType = "League";
                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = unclaimedContest.creatorId;
                entryGain.contenderId = unclaimedContest.creatorTeamId;
                entryGain.contestId = unclaimedContest.id;
                await this.gainRepository.create(entryGain);
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
                entryGain.contestType = "League";
                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = unclaimedContest.creatorId;
                entryGain.contenderId = unclaimedContest.claimerId;
                entryGain.contestId = unclaimedContest.id;

                await this.gainRepository.create(entryGain);

                entryGain.contestType = "League";
                entryGain.amount = Number(entryAmount) * 100;
                entryGain.userId = unclaimedContest.claimerId;
                entryGain.contenderId = unclaimedContest.creatorId;
                entryGain.contestId = unclaimedContest.id;

                await this.gainRepository.create(entryGain);
            }
        });

        return contestsUnclaimed;
    }

    async syncLeagues() {
        const existingLeagues = await this.leagueRepository.find();

        //Yahoo sync
        const yahooLeagues = existingLeagues.filter(league => {
            return league.importSourceId === 2;
        });

        yahooLeagues.map(async league => {
            await this.leagueService.resyncYahoo(league.id);
            await sleep(120000);
        });
        const updatedYahooLeagues = await this.leagueRepository.find({
            where: {
                importSourceId: 2,
            },
        });

        //ESPN sync
        const espnLeagues = existingLeagues.filter(league => {
            return league.importSourceId === 1;
        });

        espnLeagues.map(async league => {
            await this.leagueService.resyncESPN(league.id);
            await sleep(120000);
        });
        const updatedEspnLeagues = await this.leagueRepository.find({
            where: {
                importSourceId: 2,
            },
        });

        return existingLeagues;
    }
}
