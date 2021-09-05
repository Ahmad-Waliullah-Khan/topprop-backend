import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '../services';
import {CRON_JOBS} from '../utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import logger from '../utils/logger';


@cronJob()
export class WithdrawFundsCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: '0 */1 * * * *', // Every 3 minute interval
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
