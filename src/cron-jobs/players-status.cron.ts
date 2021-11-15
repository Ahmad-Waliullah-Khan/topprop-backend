import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import {PLAYERS_STATUS_CRON_TIMING} from '@src/utils/cron-timings';
import chalk from 'chalk';
import cron from 'cron';
import logger from '../utils/logger';


@cronJob()
export class PlayersStatusCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: PLAYERS_STATUS_CRON_TIMING,
            name: CRON_JOBS.PLAYERS_STATUS_CRON,
            start: true,
            onTick: async () => {
                try {
                    const playerPromises = await this.cronService.updatePlayerStatus();
                    Promise.all(playerPromises);
                    this.cronService.cronLogger(CRON_JOBS.PLAYERS_STATUS_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.PLAYERS_STATUS_CRON);
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on players status cron job. Error: `, error));
                }
            },
        });
    }
}
