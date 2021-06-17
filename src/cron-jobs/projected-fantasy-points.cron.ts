import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { CRON_JOBS } from '@src/utils/constants';
import cron from 'cron';

import { CronService } from '@src/services';
import chalk from 'chalk';

@cronJob()
export class ProjectedFantasyPointsCron extends CronJob {
    constructor(@service() private cronService: CronService) {
        super({
            cronTime: '0 */1 * * * *',
            name: CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON,
            start: true,
            onTick: async () => {
                try {
                    const playerPromises = await this.cronService.processProjectedFantasyPoints();
                    Promise.all(playerPromises);
                    this.cronService.cronLogger(CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON);

                    const updatedCronTiming = await this.cronService.updatedCronConfig(
                        CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON,
                    );
                    const updatedCronTime = new cron.CronTime(updatedCronTiming);
                    this.setTime(updatedCronTime);
                    this.start();
                } catch (error) {
                    console.error(chalk.redBright(`Error on projected player fantasy points cron job. Error: `, error));
                }
            },
        });
    }
}
