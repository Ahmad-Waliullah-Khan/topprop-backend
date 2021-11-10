import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { CronService } from '@src/services';
import { CRON_JOBS } from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import logger from '../utils/logger';
import { FETCH_SCHEDULE_TIMING } from './../utils/cron-timings';

@cronJob()
export class FetchScheduleCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: FETCH_SCHEDULE_TIMING,
            name: CRON_JOBS.FETCH_SCHEDULE_CRON,
            start: true,
            onTick: async () => {
                try {
                    await this.cronService.fetchWeeklySchedule();
                    // Promise.all(weeklySchedule);
                    this.cronService.cronLogger(CRON_JOBS.FETCH_SCHEDULE_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.FETCH_SCHEDULE_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on Fetch scheduled games cron job. Error: `, error));
                }
            },
        });
    }
}
