const cronEnv = process.env.NODE_ENV ? process.env.NODE_ENV : 'production';

let CRON_TIMING_PLAYERS_CRON = '';
let CRON_TIMING_SPECIAL_TEAMS_CRON = '';
let CRON_TIMING_PROJECTED_FANTASY_POINTS_CRON = '';
let CRON_TIMING_PLAYER_FANTASY_POINTS_CRON = '';
let CRON_TIMING_WIN_CHECK_CRON = '';
let CRON_TIMING_TIMEFRAME_CRON = '';
let CRON_TIMING_CLOSE_CONTEST_CRON = '';
let CRON_TIMING_LEAGUE_WIN_CHECK_CRON = '';
let CRON_TIMING_YAHOO_SYNC_LEAGUES_CRON = '';
let CRON_TIMING_ESPN_SYNC_LEAGUES_CRON = '';
let CRON_TIMING_WITHDRAW_FUNDS_CRON = '';
let CRON_TIMING_LEAGUE_WIN_CRITERIA_CRON = '';
let CRON_TIMING_SYNC_GAMES_CRON = '';
let CRON_TIMING_SYNC_TEAMS_CRON = '';
let CRON_TIMING_ONGOING_GAMES_CRON = '';
let CRON_TIMING_BONUS_PAYOUT = '';
let CRON_TIMING_BONUS_PROCESSED = '';
let CRON_TIMING_VERIFIED_BONUS_PAYOUT = '';
let CRON_TIMING_SCHEDULE = '';

switch (cronEnv) {
    case 'development':
        CRON_TIMING_PLAYERS_CRON = '0 */1 * * * *';
        CRON_TIMING_SPECIAL_TEAMS_CRON = '0 */1 * * * *';
        CRON_TIMING_PROJECTED_FANTASY_POINTS_CRON = '0 */1 * * * *';
        CRON_TIMING_PLAYER_FANTASY_POINTS_CRON = '0 */1 * * * *';
        CRON_TIMING_WIN_CHECK_CRON = '0 */1 * * * *';
        CRON_TIMING_TIMEFRAME_CRON = '0 */1 * * * *';
        CRON_TIMING_CLOSE_CONTEST_CRON = '0 1 * * * 3';
        CRON_TIMING_LEAGUE_WIN_CHECK_CRON = '0 */1 * * * *';
        CRON_TIMING_YAHOO_SYNC_LEAGUES_CRON = '0 */1 * * * *';
        CRON_TIMING_ESPN_SYNC_LEAGUES_CRON = '0 */1 * * * *';
        CRON_TIMING_WITHDRAW_FUNDS_CRON = '0 */1 * * * *';
        CRON_TIMING_LEAGUE_WIN_CRITERIA_CRON = '0 */1 * * * *';
        CRON_TIMING_SYNC_GAMES_CRON = '0 * * * * *';
        CRON_TIMING_SYNC_TEAMS_CRON = '0 45 * * * *';
        CRON_TIMING_SYNC_GAMES_CRON = '0 * * * * *';
        CRON_TIMING_ONGOING_GAMES_CRON = '0 */1 * * * *';
        CRON_TIMING_BONUS_PAYOUT = '0 */1 * * * *';
        CRON_TIMING_BONUS_PROCESSED = '0 */1 * * * *';
        CRON_TIMING_VERIFIED_BONUS_PAYOUT = '0 */1 * * * *';
        CRON_TIMING_SCHEDULE = '0 */1 * * * *';
        break;
    case 'staging':
        CRON_TIMING_PLAYERS_CRON = '0 0 22 * * 2';
        CRON_TIMING_SPECIAL_TEAMS_CRON = '0 */1 * * * *';
        CRON_TIMING_PROJECTED_FANTASY_POINTS_CRON = '0 0 */1 */1 * *';
        CRON_TIMING_PLAYER_FANTASY_POINTS_CRON = '0 */5 * * * *';
        CRON_TIMING_WIN_CHECK_CRON = '45 */5 * * * *';
        CRON_TIMING_TIMEFRAME_CRON = '0 15 * * * 3';
        CRON_TIMING_CLOSE_CONTEST_CRON = '0 0 9 * * 2';
        CRON_TIMING_LEAGUE_WIN_CHECK_CRON = '45 */5 * * * *';
        CRON_TIMING_YAHOO_SYNC_LEAGUES_CRON = '0 */30 * * * *';
        CRON_TIMING_ESPN_SYNC_LEAGUES_CRON = '0 0 */6 * * *';
        CRON_TIMING_WITHDRAW_FUNDS_CRON = '0 */5 * * * *';
        CRON_TIMING_LEAGUE_WIN_CRITERIA_CRON = '0 */1 * * * *';
        CRON_TIMING_SYNC_GAMES_CRON = '0 30 * * * *';
        CRON_TIMING_SYNC_TEAMS_CRON = '0 45 * * * *';
        CRON_TIMING_SYNC_GAMES_CRON = '0 30 * * * *';
        CRON_TIMING_ONGOING_GAMES_CRON = '0 */5 * * * *';
        CRON_TIMING_BONUS_PAYOUT = '0 */5 * * * *';
        CRON_TIMING_BONUS_PROCESSED = '0 */5 * * * *';
        CRON_TIMING_VERIFIED_BONUS_PAYOUT = '0 */1 * * * *';
        CRON_TIMING_SCHEDULE = '0 */1 * * * *';

        break;
    case 'production':
        CRON_TIMING_PLAYERS_CRON = '0 0 22 * * 2';
        CRON_TIMING_SPECIAL_TEAMS_CRON = '0 */1 * * * *';
        CRON_TIMING_PROJECTED_FANTASY_POINTS_CRON = '0 0 */1 */1 * *';
        CRON_TIMING_PLAYER_FANTASY_POINTS_CRON = '0 */5 * * * *';
        CRON_TIMING_WIN_CHECK_CRON = '45 */5 * * * *';
        CRON_TIMING_TIMEFRAME_CRON = '0 15 * * * 3';
        CRON_TIMING_CLOSE_CONTEST_CRON = '0 0 9 * * 2';
        CRON_TIMING_LEAGUE_WIN_CHECK_CRON = '45 */5 * * * *';
        CRON_TIMING_YAHOO_SYNC_LEAGUES_CRON = '0 0 */6 * * *';
        CRON_TIMING_ESPN_SYNC_LEAGUES_CRON = '0 0 */6 * * *';
        CRON_TIMING_WITHDRAW_FUNDS_CRON = '0 */5 * * * *';
        CRON_TIMING_LEAGUE_WIN_CRITERIA_CRON = '0 */1 * * * *';
        CRON_TIMING_SYNC_GAMES_CRON = '0 30 * * * *';
        CRON_TIMING_SYNC_TEAMS_CRON = '0 45 * * * *';
        CRON_TIMING_SYNC_GAMES_CRON = '0 30 * * * *';
        CRON_TIMING_ONGOING_GAMES_CRON = '0 */5 * * * *';
        CRON_TIMING_BONUS_PAYOUT = '0 0 */1 * * *';
        CRON_TIMING_BONUS_PROCESSED = '0 0 */1 * * *';
        CRON_TIMING_VERIFIED_BONUS_PAYOUT = '0 */1 * * * *';
        CRON_TIMING_SCHEDULE = '0 */1 * * * *';
        break;
}

export const PLAYERS_CRON_TIMING = CRON_TIMING_PLAYERS_CRON;
export const SPECIAL_TEAMS_CRON_TIMING = CRON_TIMING_SPECIAL_TEAMS_CRON;
export const PROJECTED_FANTASY_POINTS_CRON_TIMING = CRON_TIMING_PROJECTED_FANTASY_POINTS_CRON;
export const PLAYER_FANTASY_POINTS_CRON_TIMING = CRON_TIMING_PLAYER_FANTASY_POINTS_CRON;
export const WIN_CHECK_CRON_TIMING = CRON_TIMING_WIN_CHECK_CRON;
export const TIMEFRAME_CRON_TIMING = CRON_TIMING_TIMEFRAME_CRON;
export const CLOSE_CONTEST_CRON_TIMING = CRON_TIMING_CLOSE_CONTEST_CRON;
export const ONGOING_GAMES_CRON_TIMING = CRON_TIMING_ONGOING_GAMES_CRON;
export const LEAGUE_WIN_CHECK_CRON_TIMING = CRON_TIMING_LEAGUE_WIN_CHECK_CRON;
export const YAHOO_SYNC_LEAGUES_CRON_TIMING = CRON_TIMING_YAHOO_SYNC_LEAGUES_CRON;
export const ESPN_SYNC_LEAGUES_CRON_TIMING = CRON_TIMING_ESPN_SYNC_LEAGUES_CRON;
export const WITHDRAW_FUNDS_CRON_TIMING = CRON_TIMING_WITHDRAW_FUNDS_CRON;
export const LEAGUE_WIN_CRITERIA_CRON_TIMING = CRON_TIMING_LEAGUE_WIN_CRITERIA_CRON;
export const SYNC_GAMES_CRON_TIMING = CRON_TIMING_SYNC_GAMES_CRON;
export const SYNC_TEAMS_CRON_TIMING = CRON_TIMING_SYNC_TEAMS_CRON;
export const PROMO_CRON_TIMING = CRON_TIMING_BONUS_PAYOUT;
export const BONUS_PROCESSED_TIMING = CRON_TIMING_BONUS_PROCESSED;
export const VERIFIED_BONUS_PAYOUT_TIMING = CRON_TIMING_VERIFIED_BONUS_PAYOUT;
export const SCHEDULE_TIMING = CRON_TIMING_SCHEDULE;
