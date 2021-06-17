import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { CRON_JOBS } from '@src/utils/constants';
import cron from 'cron';

import { CronService } from '@src/services';

import chalk from 'chalk';

@cronJob()
export class TimeframeCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: '0 */1 * * * *',
            name: CRON_JOBS.TIMEFRAME_CRON,
            onTick: async () => {
                try {
                    const timeframePromises = await this.cronService.fetchTimeframes();
                    Promise.all(timeframePromises);
                    this.cronService.cronLogger(CRON_JOBS.TIMEFRAME_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.TIMEFRAME_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    console.error(chalk.redBright(`Error on timeframe cron job. Error: `, error));
                }
            },
        });
    }
}
