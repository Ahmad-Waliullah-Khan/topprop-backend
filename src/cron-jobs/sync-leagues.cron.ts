import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';

const logger = require('../utils/logger');

@cronJob()
export class SyncLeaguesCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: '0 */6 * * *',
            name: CRON_JOBS.CLOSE_CONTEST_CRON,
            start: true,
            onTick: async () => {
                try {
                    await this.cronService.syncLeagues();
                    this.cronService.cronLogger(CRON_JOBS.SYNC_LEAGUES_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.SYNC_LEAGUES_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on sync leagues cron job. Error: `, error));
                }
            },
        });
    }
}
