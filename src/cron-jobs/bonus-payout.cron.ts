import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {PROMO_CRON_TIMING} from '@src/utils/cron-timings';
import chalk from 'chalk';
import cron from 'cron';
import logger from '../utils/logger';
import {CRON_JOBS} from './../utils/constants/misc.constants';

@cronJob()
export class BonusPayoutCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: PROMO_CRON_TIMING,
            name: CRON_JOBS.BONUS_PAYOUT_CRON,
            start: true,
            onTick: async () => {
                try {
                    const bonusPromise = await this.cronService.bonusPayout();
                    this.cronService.cronLogger(CRON_JOBS.BONUS_PAYOUT_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.BONUS_PAYOUT_CRON);

                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on bonus payout cron job. Error: `, error));
                }
            },
        });
    }
}
