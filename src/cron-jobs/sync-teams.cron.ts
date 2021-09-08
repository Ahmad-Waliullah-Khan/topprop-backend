import {service} from '@loopback/core';
import {CronJob, cronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import {TeamRepository} from '@src/repositories';
import {SportsDataService} from '@src/services';
import {CRON_JOBS} from '@src/utils/constants';
import chalk from 'chalk';
import {SYNC_TEAMS_CRON_TIMING} from '../utils/cron-timings';
import logger from '../utils/logger';

@cronJob()
export class SyncTeamsCron extends CronJob {
    constructor(
        @repository('TeamRepository') private teamRepo: TeamRepository,
        @service() private sportDataService: SportsDataService,
    ) {
        super({
            cronTime: SYNC_TEAMS_CRON_TIMING,
            name: CRON_JOBS.SYNC_TEAMS_CRON,
            onTick: async () => {
                try {
                    const remoteTeams = await this.sportDataService.activeTeams();

                    for (let index = 0; index < remoteTeams.length; index++) {
                        const remoteTeam = remoteTeams[index];
                        const team = await this.teamRepo.findOne({ where: { abbr: remoteTeam.Key } });
                        if (team) {
                            team.remoteId = "";
                            team.logoUrl = remoteTeam.WikipediaLogoUrl;
                            team.wordMarkUrl = remoteTeam.WikipediaWordMarkUrl;
                            await this.teamRepo.save(team);
                        } else logger.log(`remote team with name: ${remoteTeam.Key} does not exists in local records`);
                    }
                } catch (error) {
                    logger.error(chalk.redBright(`Error on sync team cron job. Error: `, error));
                }
            },
            start: true,
        });
    }
}
