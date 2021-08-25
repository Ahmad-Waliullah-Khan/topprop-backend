import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {CronService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import cron from 'cron';
import logger from '../utils/logger';


@cronJob()
export class SpecialTeamsCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: '0 */1 * * * *', // Every 3 minute interval
            name: CRON_JOBS.SPECIAL_TEAMS_CRON,
            start: true,
            onTick: async () => {
                try {
                    const specialTeamsPromises = await this.cronService.fetchSpecialTeams();
                    Promise.all(specialTeamsPromises);
                    this.cronService.cronLogger(CRON_JOBS.SPECIAL_TEAMS_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(CRON_JOBS.SPECIAL_TEAMS_CRON);
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
