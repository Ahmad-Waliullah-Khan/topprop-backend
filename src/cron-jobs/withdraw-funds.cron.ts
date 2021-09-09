import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import chalk from 'chalk';
import cron from 'cron';
import {CronService} from '../services';
import {CRON_JOBS} from '../utils/constants';
import {WITHDRAW_FUNDS_CRON_TIMING} from '../utils/cron-timings';
import logger from '../utils/logger';

@cronJob()
export class WithdrawFundsCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: WITHDRAW_FUNDS_CRON_TIMING,
            name: CRON_JOBS.WITHDRAW_FUNDS_CRON,
            start: true,
            onTick: async () => {
                try {
                    await this.cronService.withdrawFunds();
                    // const requestPromises = await this.cronService.withdrawFunds();
                    // Promise.all(requestPromises);
                    this.cronService.cronLogger(CRON_JOBS.WITHDRAW_FUNDS_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.WITHDRAW_FUNDS_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on player cron job. Error: `, error));
                }
            },
        });
    }
}
