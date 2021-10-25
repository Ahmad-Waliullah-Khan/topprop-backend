import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { CronService } from '@src/services';
import { CRON_JOBS } from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import { SCHEDULE_TIMING } from '../utils/cron-timings';
import logger from '../utils/logger';

@cronJob()
export class ScheduleCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: SCHEDULE_TIMING,
            name: CRON_JOBS.SCHEDULE_CRON,
            start: true,
            onTick: async () => {
                try {
                    const contestPromises = await this.cronService.processSchedulesGames();

                    Promise.all(contestPromises);
                    this.cronService.cronLogger(CRON_JOBS.SCHEDULE_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.SCHEDULE_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on scheduled games cron job. Error: `, error));
                }
            },
        });
    }
}
