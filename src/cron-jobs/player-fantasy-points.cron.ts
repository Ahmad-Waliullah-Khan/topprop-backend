import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import {PLAYER_FANTASY_POINTS_CRON_TIMING} from '../utils/cron-timings';
import logger from '../utils/logger';


@cronJob()
export class PlayerFantasyPointsCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: PLAYER_FANTASY_POINTS_CRON_TIMING,
            name: CRON_JOBS.PLAYER_FANTASY_POINTS_CRON,
            start: true,
            onTick: async () => {
                try {
                    const playerPromises = await this.cronService.processPlayerFantasyPoints();
                    Promise.all(playerPromises);
                    this.cronService.cronLogger(CRON_JOBS.PLAYER_FANTASY_POINTS_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(
                        CRON_JOBS.PLAYER_FANTASY_POINTS_CRON,
                    );
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    logger.error(chalk.redBright(`Error on player fantasy points cron job. Error: `, error));
                }
            },
        });
    }
}
