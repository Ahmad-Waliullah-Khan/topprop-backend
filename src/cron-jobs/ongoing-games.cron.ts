import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import {ONGOING_GAMES_CRON_TIMING} from '../utils/cron-timings';
import logger from '../utils/logger';


@cronJob()
export class OngoingGamesCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: ONGOING_GAMES_CRON_TIMING,
            name: CRON_JOBS.ONGOING_GAMES_CRON,
            start: true,
            onTick: async () => {
                try {
                    await this.cronService.ongoingGamesCheck();
                    this.cronService.cronLogger(CRON_JOBS.ONGOING_GAMES_CRON);
                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.ONGOING_GAMES_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on ongoing games cron job. Error: `, error));
                }
            },
        });
    }
}
