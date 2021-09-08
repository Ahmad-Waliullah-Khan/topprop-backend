import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import moment from 'moment';
import {ESPN_SYNC_LEAGUES_CRON_TIMING} from '../utils/cron-timings';
import logger from '../utils/logger';


@cronJob()
export class EspnSyncLeaguesCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: ESPN_SYNC_LEAGUES_CRON_TIMING,
            name: CRON_JOBS.ESPN_SYNC_LEAGUES_CRON,
            start: true,
            onTick: async () => {
                try {
                    logger.info(`ESPN cron started at ` + moment().format('DD-MM-YYYY hh:mm:ss a'));
                    await this.cronService.syncESPNLeagues();
                    this.cronService.cronLogger(CRON_JOBS.ESPN_SYNC_LEAGUES_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.ESPN_SYNC_LEAGUES_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on espn sync leagues cron job. Error: `, error));
                }
            },
        });
    }
}
