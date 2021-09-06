import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { PaymentGatewayService, CronService } from '../services';
import { CRON_JOBS } from '../utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import logger from '../utils/logger';

@cronJob()
export class syncTransactionsCron extends CronJob {
    constructor(
        @service() private cronService: CronService,
        @service() private paymentGatewayService: PaymentGatewayService,
    ) {
        super({
            cronTime: '0 */1 * * * *', // Every 3 minute interval
            name: CRON_JOBS.SYNC_TRANSACTIONS_CRON,
            start: true,
            onTick: async () => {
                try {
                    await this.paymentGatewayService.syncMissingTransactions();
                    this.cronService.cronLogger(CRON_JOBS.SYNC_TRANSACTIONS_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(
                        CRON_JOBS.SYNC_TRANSACTIONS_CRON,
                    );
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on sync transactions cron job. Error: `, error));
                }
            },
        });
    }
}
