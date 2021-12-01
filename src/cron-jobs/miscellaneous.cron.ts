import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService, MiscellaneousService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import {MISCELLANEOUS_TIMING} from '../utils/cron-timings';
import logger from '../utils/logger';

@cronJob()
export class MiscellaneousCron extends CronJob {
    constructor(
        @service() private cronService: CronService,
        @service() private miscellaneousService: MiscellaneousService,
    ) {
        super({
            cronTime: MISCELLANEOUS_TIMING,
            name: CRON_JOBS.MISCELLANEOUS_CRON,
            start: true,
            onTick: async () => {
                try {
                    // await this.miscellaneousService.resetNoPPRGradedContests();
                    // this.cronService.cronLogger(CRON_JOBS.MISCELLANEOUS_CRON);
                    // await this.miscellaneousService.addPromoCode();
                    // await this.miscellaneousService.updateDOB();
                    await this.miscellaneousService.resetAllPlayers();
                    // await this.miscellaneousService.updateBonusPayoutProcessed();
                    // await this.miscellaneousService.makeAllPlayersAvailable();
                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.MISCELLANEOUS_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on miscellaneous games cron job. Error: `, error));
                }
            },
        });
    }
}
