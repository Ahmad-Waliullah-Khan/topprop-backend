export const TOP_PROP_FEES_MULTIPLIER = 2;
export const MINIMUM_BET_AMOUNT = 1000;
export const MINIMUM_WITHDRAW_AMOUNT = 2000;

export enum CRON_JOBS {
    PLAYERS_CRON = 'players-cron',
    PROJECTED_FANTASY_POINTS_CRON = 'projected-fantasy-points-cron',
    PLAYER_FANTASY_POINTS_CRON = 'player-fantasy-points-cron',
    WIN_CHECK_CRON = 'win-check-cron',
    TIMEFRAME_CRON = 'timeframe-cron',
    CLOSE_CONTEST_CRON = 'close-contests-cron',
    SPECIAL_TEAMS_CRON = 'special-teams-cron',
    LEAGUE_WIN_CHECK_CRON = 'league-win-check-cron',
    LEAGUE_CLOSE_CONTEST_CRON = 'league-close-contests-cron',
    ONGOING_GAMES_CRON = 'ongoing-games-cron',
    PLAYERS_STATUS_CRON = 'players-status-cron',

    ESPN_SYNC_LEAGUES_CRON = 'espn-sync-leagues-cron',
    YAHOO_SYNC_LEAGUES_CRON = 'yahoo-sync-leagues-cron',

    WITHDRAW_FUNDS_CRON = 'withdraw-funds-cron',
    SYNC_TRANSACTIONS_CRON = 'sync-transactions-cron',

    FAKE_RESULTS_CRON = 'fake-results-cron',
    SYNC_TEAMS_CRON = 'sync-teams-cron',
    SYNC_GAMES_CRON = 'sync-games-cron',
    PLAYER_RESULTS_CRON = 'player-results-cron',

    BONUS_PAYOUT_CRON = 'verified-bonus-payout',
    BONUS_PAYOUT_PROCESSED_CRON = 'bonus-payout-processed',

    VERIFIED_BONUS_PAYPUT_CRON = 'verified-bonus-payput',
    SCHEDULE_CRON = 'scheduled-games',
    MISCELLANEOUS_CRON = 'miscellaneous',
    FETCH_SCHEDULE_CRON = 'fetch-schedule',
}

export const sportApiDateFormat = 'YYYY-MMM-DD';
export const MAX_ATTEMPT_RETRIES = 25 * 4;
