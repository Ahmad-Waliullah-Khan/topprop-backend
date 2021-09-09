import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import {TIMEFRAME_CRON_TIMING} from '../utils/cron-timings';
import logger from '../utils/logger';

@cronJob()
export class TimeframeCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: TIMEFRAME_CRON_TIMING,
            name: CRON_JOBS.TIMEFRAME_CRON,
            onTick: async () => {
                try {
                    const timeframePromises = await this.cronService.fetchTimeframes();
                    Promise.all(timeframePromises);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.TIMEFRAME_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on timeframe cron job. Error: `, error));
                }
            },
        });
    }
}
