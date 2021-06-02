export const TOP_PROP_FEES_MULTIPLIER = 2;
export const MINIMUM_BET_AMOUNT = 1000;
export const MINIMUM_WITHDRAW_AMOUNT = 10000;

export enum CRON_JOBS {
    PLAYERS_CRON = 'players-cron',
    PROJECTED_FANTASY_POINTS_CRON = 'projected-fantasy-points-cron',
    PLAYER_FANTASY_POINTS_CRON = 'player-fantasy-points-cron',
    FAKE_RESULTS_CRON = 'fake-results-cron',
    SYNC_TEAMS_CRON = 'sync-teams-cron',
    SYNC_GAMES_CRON = 'sync-games-cron',
    PLAYER_RESULTS_CRON = 'player-results-cron',
}

export const sportApiDateFormat = 'YYYY-MMM-DD';
export const MAX_ATTEMPT_RETRIES = 25 * 4;
