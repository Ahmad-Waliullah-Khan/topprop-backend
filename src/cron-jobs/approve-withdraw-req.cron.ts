import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { CronService } from '@src/services';
import { CSV_BONUS_PAYOUT_TIMING } from '@src/utils/cron-timings';
import chalk from 'chalk';
import cron from 'cron';
import { CRON_JOBS } from '../utils/constants/misc.constants';
import logger from '../utils/logger';

@cronJob()
export class ApproveWithdrawReq extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: CSV_BONUS_PAYOUT_TIMING,
            name: CRON_JOBS.APPROVE_WITHDRAW_REQ,
            start: true,
            onTick: async () => {
                try {
                    await this.cronService.approveWithdrawReq();
                    // Promise.all(withdrawApprovePromise);

                    await this.cronService.cronLogger(CRON_JOBS.APPROVE_WITHDRAW_REQ);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.BONUS_PAYOUT_CRON);

                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on withdraw approve request cron job . Error: `, error));
                }
            },
        });
    }
}

// Email;
// 'cedatem@getairmail.com',
//     'glenn@octalogic.in',
//     'glennferns92@gmail.com',
//     'pihuf@tafmail.com',
//     'reqona@tafmail.com',
//     'jopafir@boximail.com',
//     'gywefeci@givmail.com';
