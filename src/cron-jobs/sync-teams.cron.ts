import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { TeamRepository } from '@src/repositories';
import { SportsDataService } from '@src/services';
import { CRON_JOBS } from '@src/utils/constants';
import chalk from 'chalk';

@cronJob()
export class SyncTeamsCron extends CronJob {
    constructor(
        @repository('TeamRepository') private teamRepo: TeamRepository,
        @service() private sportDataService: SportsDataService,
    ) {
        super({
            // cronTime: '0 * * * * *', // Every minute
            cronTime: '0 0 23 * * *', // Every day at 23 hrs
            name: CRON_JOBS.SYNC_TEAMS_CRON,
            onTick: async () => {
                try {
                    const remoteTeams = await this.sportDataService.activeTeams();

                    for (let index = 0; index < remoteTeams.length; index++) {
                        const remoteTeam = remoteTeams[index];
                        const team = await this.teamRepo.findOne({ where: { abbr: remoteTeam.Key } });
                        if (team) {
                            team.remoteId = remoteTeam.TeamID;
                            team.logoUrl = remoteTeam.WikipediaLogoUrl;
                            team.wordMarkUrl = remoteTeam.WikipediaWordMarkUrl;
                            await this.teamRepo.save(team);
                        } else console.log(`remote team with name: ${remoteTeam.Key} does not exists in local records`);
                    }
                } catch (error) {
                    console.error(chalk.redBright(`Error on sync team cron job. Error: `, error));
                }
            },
            start: true,
        });
    }
}