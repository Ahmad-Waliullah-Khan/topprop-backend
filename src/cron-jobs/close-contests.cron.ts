import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';

const logger = require('../utils/logger');

@cronJob()
export class CloseContestsCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: '0 1 * * * 3',
            name: CRON_JOBS.CLOSE_CONTEST_CRON,
            start: true,
            onTick: async () => {
                try {
                    await this.cronService.closeContests();
                    this.cronService.cronLogger(CRON_JOBS.CLOSE_CONTEST_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.CLOSE_CONTEST_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on close contest cron job. Error: `, error));
                }
            },
        });
    }
}
