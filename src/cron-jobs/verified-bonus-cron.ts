import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { CronService } from '@src/services';
import { VERIFIED_BONUS_PAYOUT_TIMING } from '@src/utils/cron-timings';
import chalk from 'chalk';
import cron from 'cron';
import logger from '../utils/logger';
import { CRON_JOBS } from './../utils/constants/misc.constants';

@cronJob()
export class VerifiedBonusCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: VERIFIED_BONUS_PAYOUT_TIMING,
            name: CRON_JOBS.VERIFIED_BONUS_PAYPUT_CRON,
            start: true,
            onTick: async () => {
                try {
                    const verifiedPromise = await this.cronService.verifiedBonus();
                    Promise.all(verifiedPromise);
                    this.cronService.cronLogger(CRON_JOBS.VERIFIED_BONUS_PAYPUT_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(
                        CRON_JOBS.VERIFIED_BONUS_PAYPUT_CRON,
                    );

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
