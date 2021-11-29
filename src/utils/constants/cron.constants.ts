export const PROXY_DAY = process.env.CRON_PROXY_DAY || '29';
export const PROXY_MONTH = process.env.CRON_PROXY_MONTH || 'Nov';
export const PROXY_YEAR = process.env.CRON_PROXY_YEAR || '2021';
export const PROXY_SEASON_TYPE = process.env.CRON_PROXY_SEASON_TYPE || 'REG';
export const PROXY_WEEK = process.env.CRON_PROXY_WEEK || 12;
export const PROXY_DAY_OFFSET = process.env.CRON_PROXY_DAY_OFFSET || 3;


export enum CRON_RUN_TYPES {
    PRINCIPLE = 'principle',
    PROXY = 'proxy',
    STAGING = 'staging',
}

export const RUN_TYPE = process.env.RUN_TYPE || CRON_RUN_TYPES.PRINCIPLE;
