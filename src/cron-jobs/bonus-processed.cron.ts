import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {BONUS_PROCESSED_TIMING} from '@src/utils/cron-timings';
import logger from '@src/utils/logger';
import chalk from 'chalk';
import cron from 'cron';
import {CRON_JOBS} from './../utils/constants/misc.constants';

@cronJob()
export class BonusProcessedCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: BONUS_PROCESSED_TIMING,
            name: CRON_JOBS.BONUS_PAYOUT_PROCESSED_CRON,
            start: true,
            onTick: async () => {
                try {
                    const bonusPromise = await this.cronService.bonusProcessed();
                    this.cronService.cronLogger(CRON_JOBS.BONUS_PAYOUT_PROCESSED_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(
                        CRON_JOBS.BONUS_PAYOUT_PROCESSED_CRON,
                    );

                    const updatedCronTime = new cron.CronTime(updatedCronTiming);

                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on bonus processed cron job. Error: `, error));
                }
            },
        });
    }
}
