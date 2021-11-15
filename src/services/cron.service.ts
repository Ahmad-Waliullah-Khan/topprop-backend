import {BindingScope, injectable, service} from '@loopback/core';
import {repository, Where} from '@loopback/repository';
import {Bet, Gain, LeagueContest, LeagueContestRelations, Player, Timeframe, TopUp, User} from '@src/models';
import {
    BetRepository,
    BonusPayoutRepository,
    ConfigRepository,
    ContestRepository,
    ContestRosterRepository,
    CouponCodeRepository,
    GainRepository,
    LeagueContestRepository,
    LeagueRepository,
    PlayerRepository,
    RosterRepository,
    TeamRepository,
    TimeframeRepository,
    TopUpRepository,
    UserRepository,
    WithdrawRequestRepository
} from '@src/repositories';
import {ErrorHandler, MiscHelpers} from '@src/utils/helpers';
import chalk from 'chalk';
import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import moment from 'moment';
import momenttz from 'moment-timezone';
import util from 'util';
import {TRANSFER_TYPES} from '../services';
import {LeagueService} from '../services/league.service';
import {PaymentGatewayService} from '../services/payment-gateway.service';
import {SportsDataService} from '../services/sports-data.service';
import {UserService} from '../services/user.service';
import {
    BLOCKED_TIME_SLOTS,
    CONTEST_STAKEHOLDERS,
    CONTEST_STATUSES,
    CRON_JOBS,
    CRON_RUN_TYPES,
    EMAIL_TEMPLATES,
    FP_IGNORED_SLOT,
    PROXY_DAY,
    PROXY_DAY_OFFSET,
    PROXY_MONTH,
    PROXY_YEAR,
    RUN_TYPE, SCHEDULE, SCORING_TYPE,
    TIMEFRAMES,
    TIMEZONE,
    WITHDRAW_REQUEST_STATUSES
} from '../utils/constants';
import {DST_IDS} from '../utils/constants/dst.constants';
import logger from '../utils/logger';
import sleep from '../utils/sleep';
import {BONUSSTATUS} from './../utils/constants/bonus-payout.constants';

@injectable({ scope: BindingScope.TRANSIENT })
export class CronService {
    constructor(
        @service() private sportsDataService: SportsDataService,
        @service() private userService: UserService,
        @service() private leagueService: LeagueService,
        @service() private paymentGatewayService: PaymentGatewayService,
        @repository('PlayerRepository') private playerRepository: PlayerRepository,
        @repository('TimeframeRepository') private timeframeRepository: TimeframeRepository,
        @repository('ContestRepository') private contestRepository: ContestRepository,
        @repository('GainRepository') private gainRepository: GainRepository,
        @repository('TopUpRepository') protected topUpRepository: TopUpRepository,
        @repository('BetRepository') protected betRepository: BetRepository,
        @repository('UserRepository') private userRepository: UserRepository,
        @repository('LeagueContestRepository') private leagueContestRepository: LeagueContestRepository,
        @repository('TeamRepository') private teamRepository: TeamRepository,
        @repository('RosterRepository') private rosterRepository: RosterRepository,
        @repository('ContestRosterRepository') private contestRosterRepository: ContestRosterRepository,
        @repository('LeagueRepository') private leagueRepository: LeagueRepository,
        @repository('WithdrawRequestRepository') private withdrawRequestRepository: WithdrawRequestRepository,
        @repository('ConfigRepository') private configRepository: ConfigRepository,
        @repository('BonusPayoutRepository') private bonusPayoutRepository: BonusPayoutRepository,
        @repository('CouponCodeRepository') private couponCodeRepository: CouponCodeRepository,
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
                        // 0th second of 0th minute at 10am every Wednesday
                        cronTiming = '0 0 10 * * 3';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 0th minute at 10am every Wednesday
                        cronTiming = '0 0 10 * * 3';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of 0th minute at 10am every Wednesday
                        cronTiming = '0 0 10 * * 3';
                        break;
                }
                break;
            case CRON_JOBS.SPECIAL_TEAMS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 0th second of 0th minute at 10am every Wednesday
                        cronTiming = '0 0 10 * * 3';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 0th minute at 10am every tuesday
                        cronTiming = '0 0 10 * * 3';
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
                        // 0th second of 15th minute
                        cronTiming = '0 */15 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of 15th minute every wednesday
                        cronTiming = '0 */15 * * * *';
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
                        // 0th second of 0th minute every hour
                        cronTiming = '0 0 */1 * * *';
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
                        cronTiming = '0 */30 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of every 30th minute
                        cronTiming = '0 */30 * * * *';
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
                        // 0th second of every 30th minute
                        cronTiming = '0 */30 * * * *';
                        break;
                }
                break;

            case CRON_JOBS.WITHDRAW_FUNDS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 45th second of every 5 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th second of every 0th and 30th minute
                        cronTiming = '0 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 0th second of every 5th minute
                        cronTiming = '0 */5 * * * *';
                        break;
                }
                break;

            case CRON_JOBS.SYNC_TRANSACTIONS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 0th minute every hour
                        cronTiming = '0 0 */12 * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 0th minute every hour
                        cronTiming = '0 0 */1 * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // Every 12 hours - twice a day
                        cronTiming = '0 0 */12 * * *';
                        break;
                }
                break;

            case CRON_JOBS.ONGOING_GAMES_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // Every 5 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // Every 5 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // Every 2 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                }
                break;

            case CRON_JOBS.BONUS_PAYOUT_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // Every hour
                        cronTiming = '0 0 */1 * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // Every 5 minutes
                        cronTiming = '0 0 */1 * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // Every 2 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.BONUS_PAYOUT_PROCESSED_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // Every hour
                        cronTiming = '0 0 */1 * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // Every 5 minutes
                        cronTiming = '0 0 */1 * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // Every 2 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.VERIFIED_BONUS_PAYPUT_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // Every hour
                        cronTiming = '0 0 * * * 3';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // Every 5 minutes
                        cronTiming = '0 0 */5 * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // Every 2 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.SCHEDULE_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // Every hour
                        cronTiming = '0 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // Every 5 minutes
                        cronTiming = '0 */5 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // Every 2 minutes
                        cronTiming = '0 */2 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.MISCELLANEOUS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // 1st of Feb
                        cronTiming = '* * * * 2 *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // 1st of Feb
                        cronTiming = '* * * * 2 *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // 1st of Feb
                        cronTiming = '* * * * 2 *';
                        break;
                }
                break;
            case CRON_JOBS.PLAYERS_STATUS_CRON:
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        // Every 15 minutes
                        cronTiming = '0 */15 * * * *';
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        // Every 15 minutes
                        cronTiming = '0 */15 * * * *';
                        break;
                    case CRON_RUN_TYPES.PROXY:
                        // Every 15 minutes
                        cronTiming = '0 */15 * * * *';
                        break;
                }
                break;
            case CRON_JOBS.FETCH_SCHEDULE_CRON:
            switch (RUN_TYPE) {
                case CRON_RUN_TYPES.PRINCIPLE:
                    // Every hour
                    cronTiming = '0 0 0 */1 * *';
                    break;
                case CRON_RUN_TYPES.STAGING:
                    // Every 5 minutes
                    cronTiming = '0 0 0 */1 * *';
                    break;
                case CRON_RUN_TYPES.PROXY:
                    // Once a week
                    cronTiming = '0 0 0 */1 * *';
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
            case CRON_JOBS.WITHDRAW_FUNDS_CRON:
                cronMessage = 'Withdraw Cron';
                break;
            case CRON_JOBS.SYNC_TRANSACTIONS_CRON:
                cronMessage = 'Sync Transaction Cron';
                break;
            case CRON_JOBS.ONGOING_GAMES_CRON:
                cronMessage = 'Ongoing Games Check Cron';
                break;
            case CRON_JOBS.BONUS_PAYOUT_CRON:
                cronMessage = 'Bonus payout Cron';
                break;
            case CRON_JOBS.BONUS_PAYOUT_PROCESSED_CRON:
                cronMessage = 'Bonus processed Cron';
                break;
            case CRON_JOBS.SCHEDULE_CRON:
                cronMessage = 'Scheduled Games processed Cron';
                break;
            case CRON_JOBS.MISCELLANEOUS_CRON:
                cronMessage = 'Miscellaneous functions Cron';
                break;
            case CRON_JOBS.PLAYERS_STATUS_CRON:
                cronMessage = 'Players Status';
                break;
        }

        console.log(chalk.green(`${cronMessage} cron finished at`, moment().format('DD-MM-YYYY hh:mm:ss a')));

        logger.info(`${cronMessage} cron finished at ` + moment().format('DD-MM-YYYY hh:mm:ss a'));
    }

    async processPlayerFantasyPoints() {
        const currentDate = await this.fetchDate();
        const remotePlayers = await this.sportsDataService.fantasyPointsByDate(currentDate);
        const localPlayers = await this.playerRepository.find();
        const currentTime = moment().tz(TIMEZONE);

        const startObject = { hour: FP_IGNORED_SLOT.startHour, minute: FP_IGNORED_SLOT.startMinute };
        const startDatetime = momenttz.tz(startObject, TIMEZONE).day(FP_IGNORED_SLOT.startDay).subtract(1, 'minute');

        const endObject = { hour: FP_IGNORED_SLOT.endHour, minute: FP_IGNORED_SLOT.endMinute };
        const endDatetime = momenttz.tz(endObject, TIMEZONE).day(FP_IGNORED_SLOT.endDay).add(1, 'minute');

        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
                switch (RUN_TYPE) {
                    case CRON_RUN_TYPES.PRINCIPLE:
                        if (!currentTime.isBetween(startDatetime, endDatetime, 'minute')) {
                            foundLocalPlayer.hasStarted = remotePlayer.HasStarted;
                            foundLocalPlayer.isOver = remotePlayer.IsOver;
                            foundLocalPlayer.fantasyPoints = remotePlayer.FantasyPoints;
                            foundLocalPlayer.fantasyPointsHalfPpr =
                                remotePlayer.FantasyPointsYahoo || remotePlayer.FantasyPointsFanDuel;
                            foundLocalPlayer.fantasyPointsFullPpr = remotePlayer.FantasyPointsPPR;
                            await this.playerRepository.save(foundLocalPlayer);
                        }
                        break;
                    case CRON_RUN_TYPES.STAGING:
                        const today = moment().format('dddd');
                        const gameDay = moment(remotePlayer.Date).format('dddd');
                        if (!currentTime.isBetween(startDatetime, endDatetime, 'minute')) {
                            if (today === gameDay) {
                                foundLocalPlayer.hasStarted = remotePlayer.HasStarted;
                                foundLocalPlayer.isOver = remotePlayer.IsOver;
                                foundLocalPlayer.fantasyPoints = remotePlayer.FantasyPoints;
                                foundLocalPlayer.fantasyPointsHalfPpr =
                                    remotePlayer.FantasyPointsYahoo || remotePlayer.FantasyPointsFanDuel;
                                foundLocalPlayer.fantasyPointsFullPpr = remotePlayer.FantasyPointsPPR;
                                await this.playerRepository.save(foundLocalPlayer);
                            }
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
            } else {
                logger.info(`Could not find ${remotePlayer.Name} during fetch Fantasy Points`);
            }
        });

        return playerPromises;
    }

    async processProjectedFantasyPoints() {
        const currentDate = await this.fetchDate();
        const currentSeason = await this.fetchSeason();

        const currentWeek = await this.sportsDataService.currentWeek();

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

        const remotePlayersHalfPpr = await this.sportsDataService.projectedHalfPprFantasyPointsByWeeek(
            currentSeason,
            currentWeek,
        );

        const playerHalfPprProjectionPromises = remotePlayersHalfPpr.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
                foundLocalPlayer.projectedFantasyPointsHalfPpr = remotePlayer.FantasyPointsFanDuel;
                await this.playerRepository.save(foundLocalPlayer);
            }
        });

        return playerPromises;
    }

    // FETCH WEEKLY SCHEDULE
    async fetchWeeklySchedule() {
        const [currentTimeFrame] = await this.sportsDataService.timeFrames(TIMEFRAMES.CURRENT);

        const seasonSchedule = await this.sportsDataService.scheduleBySeason(currentTimeFrame.ApiSeason);

        // const weekScheduleGames = seasonSchedule.filter(
        //     game =>  isEqual(game.Week, +currentTimeFrame.ApiWeek),
        // );

        // write JSON file
        fs.writeFileSync('./src/utils/constants/schedule.week.json', JSON.stringify(seasonSchedule), 'utf8');

        return;
    }

    async processSchedulesGames() {
        const currentWeek = await this.sportsDataService.currentWeek();

        const weekGames = SCHEDULE.filter(scheduledGame => scheduledGame.week === currentWeek);

        // const rawData = fs.readFileSync('./src/utils/constants/schedule.week.json', 'utf8');
        // const weeklyGames = JSON.parse(rawData);

        const currentTime = momenttz().tz(TIMEZONE).add(1, 'minute');
        // const currentTime = momenttz.tz('2021-11-13T12:30:00', TIMEZONE).add(1, 'minute');
        const currentDay = currentTime.day();
        const clonedCurrentTime = currentTime.clone();
        let startOfGameWeek = clonedCurrentTime.day(4).startOf('day');
        if (currentDay < 3) {
            startOfGameWeek = clonedCurrentTime.day(-3).startOf('day');
        }

        // const scheduledGames = weekGames.filter(game => {
        //     const gameDate = momenttz.tz(game.dateTime, TIMEZONE);

        const scheduledGames = weekGames.filter(game => {
            const gameDate = momenttz.tz(game.dateTime, TIMEZONE);
            return gameDate.isBetween(startOfGameWeek, currentTime, 'minute');
        });

        const teamList: string[] = [];

        scheduledGames.forEach(scheduledGame => {
            if (scheduledGame.awayTeam) {
                teamList.push(scheduledGame.awayTeam);
            }
            if (scheduledGame.homeTeam) {
                teamList.push(scheduledGame.homeTeam);
            }
        });

        const foundPlayers = await this.playerRepository.find({
            fields: { id: true },
            where: {
                teamName: { inq: teamList },
            },
        });

        const playerIdList = foundPlayers.map(player => player.id);

        await this.playerRepository.updateAll({ hasStarted: true }, { id: { inq: playerIdList } });

        const contests = await this.contestRepository.find({
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
                or: [{ creatorPlayerId: { inq: playerIdList } }, { claimerPlayerId: { inq: playerIdList } }],
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        });
        await this.closeContestsFromList(contests);

        // const byeGames = weekGames.filter((game: { AwayTeam: string }) => game.AwayTeam === 'BYE');
        const byeGames = weekGames.filter(game => game.awayTeam === 'BYE');
        const byeTeamList: string[] = [];

        byeGames.forEach(byeGame => {
            if (byeGame.homeTeam) {
                byeTeamList.push(byeGame.homeTeam);
            }
        });

        const foundByePlayers = await this.playerRepository.find({
            fields: { id: true },
            where: {
                teamName: { inq: byeTeamList },
            },
        });

        const byePlayerIdList = foundByePlayers.map(player => player.id);

        await this.playerRepository.updateAll(
            {
                hasStarted: true,
                isOver: true,
                projectedFantasyPoints: 0,
                fantasyPoints: 0,
                fantasyPointsHalfPpr: 0,
                fantasyPointsFullPpr: 0,
            },
            { id: { inq: byePlayerIdList } },
        );

        return contests;
    }

    async winCheck() {
        const contests = await this.contestRepository.find({
            where: {
                status: CONTEST_STATUSES.MATCHED,
                ended: false,
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        });

        // TODO: Comment out, to force win-check without match being over
        // const filteredContests = contests.filter(contest => {
        //     return !contest.creatorPlayer?.isOver && !contest.claimerPlayer?.isOver;
        // });

        const filteredContests = contests.filter(contest => {
            return contest.creatorPlayer?.isOver && contest.claimerPlayer?.isOver;
        });

        filteredContests.map(async contest => {
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
                fantasyPointsHalfPpr: 0,
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
                fantasyPointsHalfPpr: 0,
            };

            const entryAmount = Number(contest.entryAmount);
            const mlValue = Number(contest.mlValue);
            const spreadValue = Number(contest.spreadValue);
            let topPropProfit = 0;
            let winner = '';

            if (contest.creatorPlayerSpread < contest.claimerPlayerSpread) {
                favorite.type = CONTEST_STAKEHOLDERS.CREATOR;
                favorite.playerWinBonus = Number(contest.creatorPlayerWinBonus);
                favorite.playerMaxWin = Number(contest.creatorPlayerMaxWin);
                favorite.playerCover = Number(contest.creatorPlayerCover);
                favorite.playerSpread = Number(contest.creatorPlayerSpread);
                favorite.userId = contest.creatorId;
                favorite.playerId = contest.creatorPlayerId;
                favorite.fantasyPoints = contest.creatorPlayer ? Number(contest.creatorPlayer.fantasyPoints) : 0;
                favorite.fantasyPointsHalfPpr = contest.creatorPlayer
                    ? Number(contest.creatorPlayer.fantasyPointsHalfPpr)
                    : 0;
                favorite.projectedFantasyPoints = contest.creatorPlayer
                    ? Number(contest.creatorPlayer.projectedFantasyPoints)
                    : 0;

                underdog.type = CONTEST_STAKEHOLDERS.CLAIMER;
                underdog.playerWinBonus = Number(contest.claimerPlayerWinBonus);
                underdog.playerMaxWin = Number(contest.claimerPlayerMaxWin);
                underdog.playerCover = Number(contest.claimerPlayerCover);
                underdog.playerSpread = Number(contest.claimerPlayerSpread);
                underdog.userId = contest.claimerId;
                underdog.playerId = contest.claimerPlayerId;
                underdog.fantasyPoints = contest.claimerPlayer ? Number(contest.claimerPlayer.fantasyPoints) : 0;
                underdog.fantasyPointsHalfPpr = contest.claimerPlayer
                    ? Number(contest.claimerPlayer.fantasyPointsHalfPpr)
                    : 0;
                underdog.projectedFantasyPoints = contest.claimerPlayer
                    ? Number(contest.claimerPlayer.projectedFantasyPoints)
                    : 0;
            } else {
                underdog.type = CONTEST_STAKEHOLDERS.CREATOR;
                underdog.playerWinBonus = Number(contest.creatorPlayerWinBonus);
                underdog.playerMaxWin = Number(contest.creatorPlayerMaxWin);
                underdog.playerCover = Number(contest.creatorPlayerCover);
                underdog.playerSpread = Number(contest.creatorPlayerSpread);
                underdog.userId = contest.creatorId;
                underdog.playerId = contest.creatorPlayerId;
                underdog.fantasyPoints = contest.creatorPlayer ? Number(contest.creatorPlayer.fantasyPoints) : 0;
                underdog.fantasyPointsHalfPpr = contest.creatorPlayer
                    ? Number(contest.creatorPlayer.fantasyPointsHalfPpr)
                    : 0;
                underdog.projectedFantasyPoints = contest.creatorPlayer
                    ? Number(contest.creatorPlayer.projectedFantasyPoints)
                    : 0;

                favorite.type = CONTEST_STAKEHOLDERS.CLAIMER;
                favorite.playerWinBonus = Number(contest.claimerPlayerWinBonus);
                favorite.playerMaxWin = Number(contest.claimerPlayerMaxWin);
                favorite.playerCover = Number(contest.claimerPlayerCover);
                favorite.playerSpread = Number(contest.claimerPlayerSpread);
                favorite.userId = contest.claimerId;
                favorite.playerId = contest.claimerPlayerId;
                favorite.fantasyPoints = contest.claimerPlayer ? Number(contest.claimerPlayer.fantasyPoints) : 0;
                favorite.fantasyPointsHalfPpr = contest.claimerPlayer
                    ? Number(contest.claimerPlayer.fantasyPointsHalfPpr)
                    : 0;
                favorite.projectedFantasyPoints = contest.claimerPlayer
                    ? Number(contest.claimerPlayer.projectedFantasyPoints)
                    : 0;
            }

            // TEST BENCH START
            // favorite.fantasyPoints = 6;
            // underdog.fantasyPoints = 2;
            // TEST BENCH END

            favorite.gameWin = favorite.fantasyPointsHalfPpr > underdog.fantasyPointsHalfPpr;
            underdog.gameWin = underdog.fantasyPointsHalfPpr >= favorite.fantasyPointsHalfPpr;

            favorite.coversSpread =
                favorite.fantasyPointsHalfPpr - Number(underdog.playerSpread) > underdog.fantasyPointsHalfPpr;
            underdog.coversSpread =
                underdog.fantasyPointsHalfPpr + Number(underdog.playerSpread) > favorite.fantasyPointsHalfPpr;

            favorite.winBonus = favorite.playerWinBonus > 0;
            underdog.winBonus = underdog.fantasyPointsHalfPpr > 0;

            if (favorite.gameWin && favorite.coversSpread) {
                // Row 1 & 2 of wiki combination table
                favorite.netEarnings = favorite.playerMaxWin;
                underdog.netEarnings = -entryAmount;
                topPropProfit = entryAmount - favorite.playerMaxWin;
                winner = 'favorite';
            } else if (underdog.gameWin && underdog.coversSpread) {
                // Row 3 & 4 of wiki combination table
                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.playerMaxWin;
                topPropProfit = entryAmount - underdog.playerMaxWin;
                winner = 'underdog';
            } else if (favorite.gameWin && !favorite.coversSpread) {
                // Row 5 & 6 of wiki combination table

                // Past spread based contest win logic for favorite win but did not cover spread
                // favorite.netEarnings = -entryAmount + Number(favorite.playerWinBonus) + mlValue;
                // underdog.netEarnings = favorite.playerCover - mlValue;
                // topPropProfit = -(underdog.netEarnings + favorite.netEarnings);

                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.playerMaxWin;
                topPropProfit = entryAmount - underdog.playerMaxWin;

                winner = 'underdog';
            } else if (!favorite.coversSpread && !underdog.coversSpread) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            } else if (!favorite.gameWin && !underdog.gameWin) {
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
                    creatorPlayerFantasyPoints: contest.creatorPlayer ? contest.creatorPlayer.fantasyPointsHalfPpr : 0,
                    claimerPlayerFantasyPoints: contest.claimerPlayer ? contest.claimerPlayer.fantasyPointsHalfPpr : 0,
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
                receiverUser = loserUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                    contestData,
                    winnerUser,
                    loserUser,
                    winnerPlayer,
                    loserPlayer,
                    receiverUser,
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
                const winnerId = winner === 'favorite' ? favorite.userId : underdog.userId;
                const winnerLabel = winner === 'favorite' ? favorite.type : underdog.type;
                const creatorWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? favorite.netEarnings : underdog.netEarnings;

                const claimerWinAmount =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? underdog.netEarnings : favorite.netEarnings;

                const creatorMaxWin =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? favorite.playerMaxWin : underdog.playerMaxWin;

                const claimerMaxWin =
                    favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? underdog.playerMaxWin : favorite.playerMaxWin;

                const constestData = {
                    winnerId: winnerId,
                    topPropProfit: topPropProfit,
                    status: CONTEST_STATUSES.CLOSED,
                    ended: true,
                    endedAt: moment(),
                    winnerLabel: winnerLabel,
                    creatorWinAmount: creatorWinAmount,
                    claimerWinAmount: claimerWinAmount,
                    creatorMaxWin: creatorMaxWin,
                    claimerMaxWin: claimerMaxWin,
                    creatorPlayerFantasyPoints: contest.creatorPlayer ? contest.creatorPlayer.fantasyPointsHalfPpr : 0,
                    claimerPlayerFantasyPoints: contest.claimerPlayer ? contest.claimerPlayer.fantasyPointsHalfPpr : 0,
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
                    const winnerPlayer = await this.playerRepository.findById(favorite.playerId);
                    const loserUser = await this.userRepository.findById(underdog.userId);
                    const loserPlayer = await this.playerRepository.findById(underdog.playerId);

                    const winnerWinAmount = favorite.netEarnings;
                    const loserWinAmount = underdog.netEarnings;
                    const winnerMaxWin = favorite.playerMaxWin;
                    const loserMaxWin = underdog.playerMaxWin;
                    const winnerSpread = favorite.playerSpread;
                    const loserSpread = underdog.playerSpread;

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        winnerWinAmount,
                        loserWinAmount,
                        winnerMaxWin,
                        loserMaxWin,
                        winnerSpread,
                        loserSpread,
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

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        winnerWinAmount,
                        loserWinAmount,
                        winnerMaxWin,
                        loserMaxWin,
                        winnerSpread,
                        loserSpread,
                        c2d: MiscHelpers.c2d,
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

                    const winnerWinAmount = underdog.netEarnings;
                    const loserWinAmount = favorite.netEarnings;
                    const winnerMaxWin = underdog.playerMaxWin;
                    const loserMaxWin = favorite.playerMaxWin;
                    const winnerSpread = underdog.playerSpread;
                    const loserSpread = favorite.playerSpread;

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        winnerWinAmount,
                        loserWinAmount,
                        winnerMaxWin,
                        loserMaxWin,
                        winnerSpread,
                        loserSpread,
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

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerPlayer,
                        loserPlayer,
                        contestData,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        winnerWinAmount,
                        loserWinAmount,
                        winnerMaxWin,
                        loserMaxWin,
                        winnerSpread,
                        loserSpread,
                        c2d: MiscHelpers.c2d,
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

                    await this.userService.sendEmail(favoriteUser, EMAIL_TEMPLATES.CONTEST_DRAW_FAVORITE, {
                        favoriteUser,
                        underdogUser,
                        favoritePlayer,
                        underdogPlayer,
                        contestData,
                        clientHost,
                        c2d: MiscHelpers.c2d,
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

                    await this.userService.sendEmail(underdogUser, EMAIL_TEMPLATES.CONTEST_DRAW_UNDERDOG, {
                        favoriteUser,
                        underdogUser,
                        favoritePlayer,
                        underdogPlayer,
                        contestData,
                        clientHost,
                        c2d: MiscHelpers.c2d,
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
            // const contestData = await this.contestRepository.findById(unclaimedContest.id);
            // const winnerUser = await this.userRepository.findById(unclaimedContest.creatorId);
            // const winnerPlayer = await this.playerRepository.findById(unclaimedContest.creatorPlayerId);
            // const loserUser = '';
            // const loserPlayer = await this.playerRepository.findById(unclaimedContest.claimerPlayerId);
            // const receiverUser = winnerUser;
            // const clientHost = process.env.CLIENT_HOST;

            // await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
            //     contestData,
            //     winnerUser,
            //     loserUser,
            //     winnerPlayer,
            //     loserPlayer,
            //     receiverUser,
            //     text: {
            //         title: `Hey ${receiverUser ? receiverUser.fullName : ''}`,
            //         subtitle: `We are sorry - your contest has been voided on TopProp. Click the button below to create a new contest. To understand why your contest was voided, view our Terms and Conditions using the link in the footer.`,
            //     },
            //     link: {
            //         url: `${clientHost}`,
            //         text: `Create New Contest`,
            //     },
            // });
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
            //TODO: Uncomment this to force run win check on every league contest
            // return true;
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
            // favorite.fantasyPoints = 132.5;
            // underdog.fantasyPoints = 130.8;
            // TEST BENCH END

            favorite.gameWin = favorite.fantasyPoints > underdog.fantasyPoints;
            underdog.gameWin = underdog.fantasyPoints >= favorite.fantasyPoints;

            favorite.coversSpread = favorite.fantasyPoints - Number(underdog.teamSpread) > underdog.fantasyPoints;
            underdog.coversSpread = underdog.fantasyPoints + Number(underdog.teamSpread) > favorite.fantasyPoints;
            favorite.winBonus = false;
            underdog.winBonus = false;

            if (favorite.gameWin && favorite.coversSpread) {
                // Row 1 & 2 of wiki combination table
                favorite.netEarnings = favorite.teamMaxWin;
                underdog.netEarnings = -entryAmount;
                topPropProfit = entryAmount - favorite.teamMaxWin;
                winner = 'favorite';
            } else if (underdog.gameWin && underdog.coversSpread) {
                // Row 3 & 4 of wiki combination table
                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.teamMaxWin;
                topPropProfit = entryAmount - underdog.teamMaxWin;
                winner = 'underdog';
            } else if (favorite.gameWin && !favorite.coversSpread) {
                // Row 5 & 6 of wiki combination table

                // Past spread based contest win logic for favorite win but did not cover spread
                // favorite.netEarnings = -entryAmount + Number(favorite.teamWinBonus) + mlValue;
                // underdog.netEarnings = favorite.teamCover - mlValue;
                // topPropProfit = -(underdog.netEarnings + favorite.netEarnings);

                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.teamMaxWin;
                topPropProfit = entryAmount - underdog.teamMaxWin;
                winner = 'underdog';
            } else if (!favorite.coversSpread && !underdog.coversSpread) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            } else if (!favorite.gameWin && !underdog.gameWin) {
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

                const favoriteTeamFantasyPoints = favorite.fantasyPoints;
                const underdogTeamFantasyPoints = underdog.fantasyPoints;

                let isFavoriteTeamSvgLogo = false;
                let isUnderdogTeamSvgLogo = false;

                if (
                    favoriteTeam.logoUrl.includes('.svg') ||
                    favoriteTeam.logoUrl.slice(favoriteTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isFavoriteTeamSvgLogo = true;
                }

                if (
                    underdogTeam.logoUrl.includes('.svg') ||
                    underdogTeam.logoUrl.slice(underdogTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isUnderdogTeamSvgLogo = true;
                }

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                    contestData,
                    favoriteUser,
                    underdogUser,
                    favoriteTeam,
                    underdogTeam,
                    isFavoriteTeamSvgLogo,
                    isUnderdogTeamSvgLogo,
                    receiverUser,
                    clientHost,
                    favoriteTeamFantasyPoints,
                    underdogTeamFantasyPoints,
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
                    isFavoriteTeamSvgLogo,
                    isUnderdogTeamSvgLogo,
                    receiverUser,
                    clientHost,
                    favoriteTeamFantasyPoints,
                    underdogTeamFantasyPoints,
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

                    let isWinnerTeamSvgLogo = false;
                    let isLoserTeamSvgLogo = false;

                    if (
                        winnerTeam.logoUrl.includes('.svg') ||
                        winnerTeam.logoUrl.slice(winnerTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isWinnerTeamSvgLogo = true;
                    }

                    if (
                        loserTeam.logoUrl.includes('.svg') ||
                        loserTeam.logoUrl.slice(loserTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isLoserTeamSvgLogo = true;
                    }

                    const winnerTeamFantasyPoints =
                        favorite.type === CONTEST_STAKEHOLDERS.CREATOR
                            ? contestData.creatorTeamFantasyPoints
                            : contestData.claimerTeamFantasyPoints;
                    const loserTeamFantasyPoints =
                        underdog.type === CONTEST_STAKEHOLDERS.CLAIMER
                            ? contestData.claimerTeamFantasyPoints
                            : contestData.creatorTeamFantasyPoints;

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
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

                    const underdogNetEarnings = underdog.netEarnings == -0 ? 0 : underdog.netEarnings;

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
                        netEarnings: underdog.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(underdogNetEarnings))}`,
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

                    let isWinnerTeamSvgLogo = false;
                    let isLoserTeamSvgLogo = false;

                    if (
                        winnerTeam.logoUrl.includes('.svg') ||
                        winnerTeam.logoUrl.slice(winnerTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isWinnerTeamSvgLogo = true;
                    }

                    if (
                        loserTeam.logoUrl.includes('.svg') ||
                        loserTeam.logoUrl.slice(loserTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isLoserTeamSvgLogo = true;
                    }

                    const winnerTeamFantasyPoints =
                        underdog.type === CONTEST_STAKEHOLDERS.CREATOR
                            ? contestData.creatorTeamFantasyPoints
                            : contestData.claimerTeamFantasyPoints;
                    const loserTeamFantasyPoints =
                        favorite.type === CONTEST_STAKEHOLDERS.CLAIMER
                            ? contestData.claimerTeamFantasyPoints
                            : contestData.creatorTeamFantasyPoints;

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
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

                    const favoriteNetEarnings = favorite.netEarnings == -0 ? 0 : favorite.netEarnings;

                    await this.userService.sendEmail(loserUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_LOST, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
                        netEarnings: favorite.netEarnings,
                        clientHost,
                        lostAmount: `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(MiscHelpers.c2d(favoriteNetEarnings))}`,
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

                    const favoriteTeamFantasyPoints =
                        underdog.type === CONTEST_STAKEHOLDERS.CREATOR
                            ? contestData.creatorTeamFantasyPoints
                            : contestData.claimerTeamFantasyPoints;
                    const underdogTeamFantasyPoints =
                        favorite.type === CONTEST_STAKEHOLDERS.CLAIMER
                            ? contestData.claimerTeamFantasyPoints
                            : contestData.creatorTeamFantasyPoints;

                    let isFavoriteTeamSvgLogo = false;
                    let isUnderdogTeamSvgLogo = false;

                    if (
                        favoriteTeam.logoUrl.includes('.svg') ||
                        favoriteTeam.logoUrl.slice(favoriteTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isFavoriteTeamSvgLogo = true;
                    }

                    if (
                        underdogTeam.logoUrl.includes('.svg') ||
                        underdogTeam.logoUrl.slice(underdogTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isUnderdogTeamSvgLogo = true;
                    }

                    await this.userService.sendEmail(favoriteUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                        favoriteUser,
                        underdogUser,
                        favoriteTeam,
                        underdogTeam,
                        isFavoriteTeamSvgLogo,
                        isUnderdogTeamSvgLogo,
                        contestData,
                        favoriteTeamFantasyPoints,
                        underdogTeamFantasyPoints,
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
                        isFavoriteTeamSvgLogo,
                        isUnderdogTeamSvgLogo,
                        contestData,
                        favoriteTeamFantasyPoints,
                        underdogTeamFantasyPoints,
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
        });

        return filteredUnClaimedLeagueContests ? filteredUnClaimedLeagueContests : filteredContests;
    }

    async leagueCoercedWinCheck(contestIds: number[]) {
        logger.debug(`League contest graded because players have isOver false ${contestIds.toString()}`);

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

            favorite.coversSpread = favorite.fantasyPoints - Number(underdog.teamSpread) > underdog.fantasyPoints;
            underdog.coversSpread = underdog.fantasyPoints + Number(underdog.teamSpread) > favorite.fantasyPoints;

            favorite.winBonus = false;
            underdog.winBonus = false;

            if (favorite.gameWin && favorite.coversSpread) {
                // Row 1 & 2 of wiki combination table
                favorite.netEarnings = favorite.teamMaxWin;
                underdog.netEarnings = -entryAmount;
                topPropProfit = entryAmount - favorite.teamMaxWin;
                winner = 'favorite';
            } else if (underdog.gameWin && underdog.coversSpread) {
                // Row 3 & 4 of wiki combination table
                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.teamMaxWin;
                topPropProfit = entryAmount - underdog.teamMaxWin;
                winner = 'underdog';
            } else if (favorite.gameWin && !favorite.coversSpread) {
                // Row 5 & 6 of wiki combination table
                favorite.netEarnings = -entryAmount;
                underdog.netEarnings = underdog.teamMaxWin;
                topPropProfit = entryAmount - underdog.teamMaxWin;
                winner = 'underdog';
            } else if (!favorite.coversSpread && !underdog.coversSpread) {
                // Draw
                favorite.netEarnings = entryAmount;
                underdog.netEarnings = entryAmount;
                topPropProfit = 0;
                winner = 'push';
            } else if (!favorite.gameWin && !underdog.gameWin) {
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

                const favoriteTeamFantasyPoints = favorite.fantasyPoints;
                const underdogTeamFantasyPoints = underdog.fantasyPoints;

                let isFavoriteTeamSvgLogo = false;
                let isUnderdogTeamSvgLogo = false;

                if (
                    favoriteTeam.logoUrl.includes('.svg') ||
                    favoriteTeam.logoUrl.slice(favoriteTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isFavoriteTeamSvgLogo = true;
                }

                if (
                    underdogTeam.logoUrl.includes('.svg') ||
                    underdogTeam.logoUrl.slice(underdogTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isUnderdogTeamSvgLogo = true;
                }

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                    contestData,
                    favoriteUser,
                    underdogUser,
                    favoriteTeam,
                    underdogTeam,
                    isFavoriteTeamSvgLogo,
                    isUnderdogTeamSvgLogo,
                    receiverUser,
                    clientHost,
                    favoriteTeamFantasyPoints,
                    underdogTeamFantasyPoints,
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
                    isFavoriteTeamSvgLogo,
                    isUnderdogTeamSvgLogo,
                    receiverUser,
                    clientHost,
                    favoriteTeamFantasyPoints,
                    underdogTeamFantasyPoints,
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
                winningGain.amount = Number(winningAmount);
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

                    const winnerTeamFantasyPoints = favorite.fantasyPoints;
                    const loserTeamFantasyPoints = underdog.fantasyPoints;

                    let isWinnerTeamSvgLogo = false;
                    let isLoserTeamSvgLogo = false;

                    if (
                        winnerTeam.logoUrl.includes('.svg') ||
                        winnerTeam.logoUrl.slice(winnerTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isWinnerTeamSvgLogo = true;
                    }

                    if (
                        loserTeam.logoUrl.includes('.svg') ||
                        loserTeam.logoUrl.slice(loserTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isLoserTeamSvgLogo = true;
                    }

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
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
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
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

                    const winnerTeamFantasyPoints = underdog.fantasyPoints;
                    const loserTeamFantasyPoints = favorite.fantasyPoints;

                    let isWinnerTeamSvgLogo = false;
                    let isLoserTeamSvgLogo = false;

                    if (
                        winnerTeam.logoUrl.includes('.svg') ||
                        winnerTeam.logoUrl.slice(winnerTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isWinnerTeamSvgLogo = true;
                    }

                    if (
                        loserTeam.logoUrl.includes('.svg') ||
                        loserTeam.logoUrl.slice(loserTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isLoserTeamSvgLogo = true;
                    }

                    await this.userService.sendEmail(winnerUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_WON, {
                        winnerUser,
                        loserUser,
                        winnerTeam,
                        loserTeam,
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
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
                        isWinnerTeamSvgLogo,
                        isLoserTeamSvgLogo,
                        contestData,
                        winnerTeamFantasyPoints,
                        loserTeamFantasyPoints,
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

                    const favoriteTeamFantasyPoints = favorite.fantasyPoints;
                    const underdogTeamFantasyPoints = underdog.fantasyPoints;

                    let isFavoriteTeamSvgLogo = false;
                    let isUnderdogTeamSvgLogo = false;

                    if (
                        favoriteTeam.logoUrl.includes('.svg') ||
                        favoriteTeam.logoUrl.slice(favoriteTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isFavoriteTeamSvgLogo = true;
                    }

                    if (
                        underdogTeam.logoUrl.includes('.svg') ||
                        underdogTeam.logoUrl.slice(underdogTeam.logoUrl.length - 4) === '.svg'
                    ) {
                        isUnderdogTeamSvgLogo = true;
                    }

                    await this.userService.sendEmail(favoriteUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_DRAW_FAVORITE, {
                        favoriteUser,
                        underdogUser,
                        favoriteTeam,
                        underdogTeam,
                        isFavoriteTeamSvgLogo,
                        isUnderdogTeamSvgLogo,
                        contestData,
                        clientHost,
                        favoriteTeamFantasyPoints,
                        underdogTeamFantasyPoints,
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
                        isFavoriteTeamSvgLogo,
                        isUnderdogTeamSvgLogo,
                        contestData,
                        clientHost,
                        favoriteTeamFantasyPoints,
                        underdogTeamFantasyPoints,
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
        const contests = await this.contestRepository.find({
            where: {
                // status: CONTEST_STATUSES.OPEN,
                ended: false,
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        });

        await this.closeContestsFromList(contests);

        await this.playerRepository.updateAll(
            { isOver: true, hasStarted: true },
            { id: { gt: 0 } },
            (err: any, info: any) => {},
        );

        return contests;
    }

    async closeContestsFromList(contests: any[]) {
        contests.map(async contest => {
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

                const contestData = await this.contestRepository.findById(contest.id);

                const entryGain = new Gain();
                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = contestData.creatorId;
                // entryGain.contenderId = favorite.playerId;
                entryGain.contestId = contest.id;
                await this.gainRepository.create(entryGain);

                //Send Contest Closed mail
                const winnerUser = await this.userRepository.findById(contestData.creatorId);
                const winnerPlayer = await this.playerRepository.findById(contestData.creatorPlayerId);
                const loserUser = null;
                const loserPlayer = await this.playerRepository.findById(contestData.claimerPlayerId);
                const winnerPlayerMaxWin = contestData.creatorPlayerMaxWin;
                const clientHost = process.env.CLIENT_HOST;
                const receiverUser = winnerUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                    contestData,
                    winnerUser,
                    winnerPlayer,
                    winnerPlayerMaxWin,
                    loserUser,
                    loserPlayer,
                    receiverUser,
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

                const contestData = await this.contestRepository.findById(contest.id);

                const entryGain = new Gain();
                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = contestData.creatorId;
                // entryGain.contenderId = underdog.playerId;
                entryGain.contestId = contest.id;

                await this.gainRepository.create(entryGain);

                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = contestData.claimerId;
                // entryGain.contenderId = favorite.playerId;
                entryGain.contestId = contest.id;

                await this.gainRepository.create(entryGain);

                const winnerUser = await this.userRepository.findById(contestData.creatorId);
                const winnerPlayer = await this.playerRepository.findById(contestData.creatorPlayerId);
                const loserUser = await this.userRepository.findById(contestData.claimerId);
                const loserPlayer = await this.playerRepository.findById(contestData.claimerPlayerId);
                const winnerPlayerMaxWin = contestData.creatorPlayerMaxWin;
                const clientHost = process.env.CLIENT_HOST;

                let receiverUser = winnerUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                    contestData,
                    winnerUser,
                    winnerPlayer,
                    winnerPlayerMaxWin,
                    loserUser,
                    loserPlayer,
                    receiverUser,
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

                receiverUser = loserUser;
                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.CONTEST_CLOSED, {
                    contestData,
                    winnerUser,
                    loserUser,
                    winnerPlayer,
                    winnerPlayerMaxWin,
                    loserPlayer,
                    receiverUser,
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
                // foundLocalPlayer.isOver = false;
                foundLocalPlayer.projectedFantasyPoints = 0;
                if (records.some(record => record.PlayerID === `${foundLocalPlayer.remoteId}`)) {
                    const record = records.find(record => record.PlayerID === `${foundLocalPlayer.remoteId}`);
                    if (record.EspnPlayerID.trim() !== '') {
                        foundLocalPlayer.espnPlayerId = record.EspnPlayerID;
                    }
                }
                return this.playerRepository.save(foundLocalPlayer);
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
                newLocalPlayer.isOver = false;
                newLocalPlayer.projectedFantasyPoints = 0;
                if (records.some(record => record.PlayerID === `${newLocalPlayer.remoteId}`)) {
                    const record = records.find(record => record.PlayerID === `${newLocalPlayer.remoteId}`);
                    if (record.EspnPlayerID.trim() !== '') {
                        newLocalPlayer.espnPlayerId = record.EspnPlayerID;
                    }
                }
                return this.playerRepository.create(newLocalPlayer);
            }
        });

        if (localPlayers.length > 0) {
            this.playerRepository.updateAll(
                { isOver: false, hasStarted: false, projectedFantasyPoints: 0, projectedFantasyPointsHalfPpr: 0 },
                { id: { gt: 0 } },
                (err: any, info: any) => {},
            );
        }

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
                foundLocalPlayer.isOver = false;
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
                newLocalPlayer.isOver = false;
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

                let isCreatorTeamSvgLogo = false;
                let isClaimerTeamSvgLogo = false;

                if (
                    creatorTeam.logoUrl.includes('.svg') ||
                    creatorTeam.logoUrl.slice(creatorTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isCreatorTeamSvgLogo = true;
                }

                if (
                    claimerTeam.logoUrl.includes('.svg') ||
                    claimerTeam.logoUrl.slice(claimerTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isClaimerTeamSvgLogo = true;
                }

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                    contestData,
                    creatorUser,
                    claimerUser,
                    creatorTeam,
                    claimerTeam,
                    isCreatorTeamSvgLogo,
                    isClaimerTeamSvgLogo,
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
        logger.debug(`League contest voided because players are ruled out ${playerIds.toString()}`);
        const includes = await this.leagueService.fetchLeagueContestInclude();

        const contests = await this.leagueContestRepository.find({
            where: {
                or: [{ status: CONTEST_STATUSES.OPEN }, { status: CONTEST_STATUSES.MATCHED }],
                ended: false,
            },
            include: includes.include,
        });

        const filteredContests: (LeagueContest & LeagueContestRelations)[] = [];

        await Promise.all(
            contests.map(async contest => {
                const { creatorContestTeam, claimerContestTeam, league } = contest;

                await this.savePlayerEarnedFantasyPoints(creatorContestTeam, league);
                await this.savePlayerEarnedFantasyPoints(claimerContestTeam, league);

                const creatorRoster = creatorContestTeam?.contestRosters || [];
                const claimerRoster = claimerContestTeam?.contestRosters || [];
                let voidContest = false;
                creatorRoster.forEach(rosterEntry => {
                    //@ts-ignore
                    const currentPlayer = rosterEntry?.player;
                    if (playerIds.includes(currentPlayer.id)) {
                        voidContest = true;
                    }
                });

                claimerRoster.forEach(rosterEntry => {
                    //@ts-ignore
                    const currentPlayer = rosterEntry?.player;
                    if (playerIds.includes(currentPlayer.id)) {
                        voidContest = true;
                    }
                });
                if (voidContest) {
                    filteredContests.push(contest);
                }
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

                let isCreatorTeamSvgLogo = false;
                let isClaimerTeamSvgLogo = false;

                if (
                    creatorTeam.logoUrl.includes('.svg') ||
                    creatorTeam.logoUrl.slice(creatorTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isCreatorTeamSvgLogo = true;
                }

                if (
                    claimerTeam.logoUrl.includes('.svg') ||
                    claimerTeam.logoUrl.slice(claimerTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isClaimerTeamSvgLogo = true;
                }

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                    contestData,
                    creatorUser,
                    claimerUser,
                    creatorTeam,
                    claimerTeam,
                    isCreatorTeamSvgLogo,
                    isClaimerTeamSvgLogo,
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

                let isCreatorTeamSvgLogo = false;
                let isClaimerTeamSvgLogo = false;

                if (
                    creatorTeam.logoUrl.includes('.svg') ||
                    creatorTeam.logoUrl.slice(creatorTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isCreatorTeamSvgLogo = true;
                }

                if (
                    claimerTeam.logoUrl.includes('.svg') ||
                    claimerTeam.logoUrl.slice(claimerTeam.logoUrl.length - 4) === '.svg'
                ) {
                    isClaimerTeamSvgLogo = true;
                }

                await this.userService.sendEmail(receiverUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLOSED, {
                    contestData,
                    creatorUser,
                    claimerUser,
                    creatorTeam,
                    claimerTeam,
                    isCreatorTeamSvgLogo,
                    isClaimerTeamSvgLogo,
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
                    isCreatorTeamSvgLogo,
                    isClaimerTeamSvgLogo,
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
        logger.debug(`League contests voided ${JSON.stringify(filteredContests)}`);
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

        for (let i = 0; i < espnLeagues.length; i++) {
            const league = espnLeagues[i];
            await this.leagueService.resyncESPN(league.id);
            await sleep(30000);
        }

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

        for (let i = 0; i < yahooLeagues.length; i++) {
            const league = yahooLeagues[i];
            await this.leagueService.resyncYahoo(league.id);
            await sleep(10000);
        }

        const updatedYahooLeagues = await this.leagueRepository.find({
            where: {
                importSourceId: 2,
            },
        });
    }

    async bonusPayout() {
        const users = await this.userRepository.find({
            where: {
                bonusPayoutProcessed: false,
            },
        });
        if (users) {
            users.map(async user => {
                if (user.verifiedAt) {
                    const pattern = new RegExp('^' + user.promo + '$', 'i');
                    const couponData = await this.couponCodeRepository.findOne({
                        where: { code: { regexp: pattern } },
                    });
                    if (couponData) {
                        const bonusPayoutData = {
                            amount: couponData?.value,
                            message: couponData?.code,
                            status: BONUSSTATUS.PENDING,
                            userId: user.id,
                        };
                        await this.bonusPayoutRepository.create(bonusPayoutData);
                        await this.userRepository.updateById(user.id, {
                            bonusPayoutProcessed: true,
                        });
                    }
                }
            });
        }

        // Bonus Payouts Manual

        const readFile = util.promisify(fs.readFile);
        // const filePath = 'src/seeders/bonus_payouts.csv';
        const filePath = process.env.BONUS_PAYOUT_FILE_PATH;
        let records: any[] = [];
        if (filePath && fs.existsSync(filePath)) {
            try {
                const data = await readFile(filePath, 'utf8');
                records = parse(data, {
                    columns: true,
                    skip_empty_lines: true,
                });
            } catch (err) {
                logger.error(err);
            }
        }

        records.forEach(async bonus => {
            const user = await this.userRepository.findOne({ where: { email: bonus.Email } });
            if (user) {
                const bonusPayoutPayload = {
                    amount: Number(bonus?.Amount) || 0,
                    message: bonus?.Reason || 'Out of Band',
                    status: BONUSSTATUS.PENDING,
                    userId: user.id,
                };
                await this.bonusPayoutRepository.create(bonusPayoutPayload);
            }
        });

        if (filePath && fs.existsSync(filePath)) {
            fs.unlink(filePath, err => {
                if (err) {
                    console.log(err);
                }
            });
        }

        return users;
    }

    async bonusProcessed() {
        // pending payout
        const pendingBonus = await this.bonusPayoutRepository.find({
            where: {
                status: BONUSSTATUS.PENDING,
            },
        });

        if (pendingBonus) {
            pendingBonus.map(async bonus => {
                const topupData = {
                    userId: bonus.userId,
                    grossAmount: bonus.amount,
                    netAmount: bonus.amount,
                };
                await this.topUpRepository.create(topupData);
                await this.bonusPayoutRepository.updateById(bonus.id, {
                    status: BONUSSTATUS.COMPLETE,
                });
            });
        }
        return pendingBonus;
    }

    async verifiedBonus() {
        const user = await this.userRepository.find({
            where: {
                _customerTokenUrl: { neq: null },
                verifiedAt: { eq: null },
            },
        });
        try {
            if (user) {
                user.map(async data => {
                    const customer = await this.paymentGatewayService.getCustomer(data._customerTokenUrl as string);
                    if (customer?.status === 'verified') {
                        data.verifiedAt = moment().toDate().toString();
                        if (data.promo) {
                            data.bonusPayoutProcessed = false;
                        } else {
                            data.bonusPayoutProcessed = true;
                        }
                        await this.userRepository.save(data);
                    }
                });
            }
        } catch (error) {
            ErrorHandler.httpError(error);
        }

        return user;
    }

    async withdrawFunds() {
        const withdrawRequests = await this.withdrawRequestRepository.find({
            where: {
                status: WITHDRAW_REQUEST_STATUSES.APPROVED,
            },
            include: [
                {
                    relation: 'user',
                },
            ],
        });
        // console.log("🚀 ~ file: cron.service.ts ~ line 2766 ~ CronService ~ withdrawFunds ~ withdrawRequests", withdrawRequests)

        await Promise.all(
            withdrawRequests.map(async request => {
                try {
                    const transferUrl = await this.paymentGatewayService.sendFunds(
                        request.user?._customerTokenUrl || '',
                        TRANSFER_TYPES.WITHDRAW,
                        request.netAmount,
                        request.destinationFundingSourceId || '',
                    );

                    const withdrawRequestData = {
                        withdrawTransferUrl: transferUrl,
                        acceptedAt: moment().toDate(),
                        status: WITHDRAW_REQUEST_STATUSES.PROCESSING,
                    };

                    await this.withdrawRequestRepository.updateById(request.id, withdrawRequestData);

                    const transferUpdate: Partial<TopUp | Bet | Gain> = {
                        withdrawTransferUrl: transferUrl,
                    };
                    const whereUpdate: Where<TopUp | Bet | Gain> = {
                        withdrawRequestId: request.id,
                    };

                    await this.topUpRepository.updateAll(transferUpdate, whereUpdate);
                    await this.betRepository.updateAll(transferUpdate, whereUpdate);
                    await this.gainRepository.updateAll(transferUpdate, whereUpdate);

                    await this.userService.sendEmail(request.user as User, EMAIL_TEMPLATES.WITHDRAW_REQUEST_ACCEPTED, {
                        user: request.user,
                        text: {
                            title: 'Withdraw Request Accepted',
                            subtitle: `Your withdraw request of ${new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            }).format(
                                MiscHelpers.c2d(request.netAmount),
                            )} was accepted and your funds will be in your bank account very soon, we will keep you in the loop.`,
                        },
                    });
                } catch (err) {
                    console.log('🚀 ~ file: cron.service.ts ~ line 2812 ~ CronService ~ withdrawFunds ~ err', err);
                    logger.error(err);
                }
            }),
        );
    }

    async ongoingGamesCheck() {
        const currentTime = moment().tz(TIMEZONE);

        // const currentTime = moment.tz('2021-09-06 01:00', TIMEZONE);

        let isInBlockedSlot = false;
        BLOCKED_TIME_SLOTS.forEach(slot => {
            const startObject = { hour: slot.startHour, minute: slot.startMinute };
            const startDatetime = momenttz.tz(startObject, TIMEZONE).day(slot.startDay).subtract(1, 'minute');

            const endObject = { hour: slot.endHour, minute: slot.endMinute };
            const endDatetime = momenttz.tz(endObject, TIMEZONE).day(slot.endDay).add(1, 'minute');

            if (currentTime.isBetween(startDatetime, endDatetime, 'minute')) {
                isInBlockedSlot = true;
            }
        });

        if (!isInBlockedSlot) {
            const config = await this.configRepository.findOne({ order: ['id DESC'] });
            if (config) {
                config.contestCreationEnabled = true;
                await this.configRepository.save(config);
            }
        } else {
            const config = await this.configRepository.findOne({ order: ['id DESC'] });
            if (config) {
                config.contestCreationEnabled = false;
                await this.configRepository.save(config);

                // Close Unclaimed Contests

                const includes = await this.leagueService.fetchLeagueContestInclude();

                const contestsUnclaimed = await this.leagueContestRepository.find({
                    where: {
                        or: [{ status: CONTEST_STATUSES.OPEN }],
                        ended: false,
                    },
                    include: includes.include,
                });

                contestsUnclaimed.map(async unclaimedContest => {
                    const entryAmount = Number(unclaimedContest.entryAmount);

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
                });
            }
        }
    }

    async updatePlayerStatus() {

        const remotePlayers = await this.sportsDataService.availablePlayers();
        const localPlayers = await this.playerRepository.find();
        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
                if(foundLocalPlayer.status !== remotePlayer.Status) {
                    foundLocalPlayer.status = remotePlayer.Status;
                    logger.info(`Player status for ${foundLocalPlayer.fullName}, changed to: ${remotePlayer.Status}`);
                    await this.playerRepository.save(foundLocalPlayer);
                }
                if(foundLocalPlayer.available !== remotePlayer.Active) {
                    foundLocalPlayer.available = remotePlayer.Active;
                    logger.info(`Player availability for ${foundLocalPlayer.fullName}, changed to: ${remotePlayer.Active}`);
                    await this.playerRepository.save(foundLocalPlayer);
                }
                if(foundLocalPlayer.teamName !== remotePlayer.Team) {
                    foundLocalPlayer.teamName = remotePlayer.Team;
                    logger.info(`Player team for ${foundLocalPlayer.fullName}, changed to: ${remotePlayer.Team}`);
                    await this.playerRepository.save(foundLocalPlayer);
                }
            }
        });

        return playerPromises;
    }
}
