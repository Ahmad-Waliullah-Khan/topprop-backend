import { service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { CronJob, cronJob } from '@loopback/cron';
import { CRON_JOBS } from '@src/utils/constants';
import cron from 'cron';

import { PlayerRepository } from '@src/repositories';

import { SportsDataService, CronService } from '@src/services';
import chalk from 'chalk';
import moment from 'moment';

import { RUN_TYPE } from '../utils/constants';

@cronJob()
export class ProjectedFantasyPointsCron extends CronJob {
    constructor(
        @repository('PlayerRepository') private playerRepository: PlayerRepository,
        @service() private sportsDataService: SportsDataService,
        @service() private cronService: CronService,
    ) {
        super({
            // cronTime: RUN_TYPE === 'principle' ? '0 0 */1 * * *' : '0 */1 * * * *',
            cronTime: '0 */1 * * * *',
            name: CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON,
            start: true,
            onTick: async () => {
                
                try {
                    const currentDate = await this.cronService.fetchDate();
                    const remotePlayers = await this.sportsDataService.projectedFantasyPointsByPlayer(currentDate);
                    const localPlayers = await this.playerRepository.find();
                    const playerPromises = remotePlayers.map(async remotePlayer => {
                        const foundLocalPlayer = localPlayers.find(
                            localPlayer => remotePlayer.PlayerID === localPlayer.remoteId,
                        );
                        if (foundLocalPlayer) {
                            foundLocalPlayer.opponentName = remotePlayer.Opponent;
                            foundLocalPlayer.homeOrAway = remotePlayer.HomeOrAway;
                            foundLocalPlayer.projectedFantasyPoints = remotePlayer.ProjectedFantasyPoints;
                            await this.playerRepository.save(foundLocalPlayer);
                        }
                    });

                    console.log('Running Fetch Fantasy Projections Cron finished at', moment().format('DD-MM-YYYY hh:mm:ss a'));

                    if (RUN_TYPE === 'principle') {
                        const updatedCronTime = new cron.CronTime('0 0/6 * * * *');
                        this.setTime(updatedCronTime);
                        this.start();
                    }else{
                        const updatedCronTime = new cron.CronTime('0 */15 * * * *');
                        this.setTime(updatedCronTime);
                        this.start();
                    }

                    Promise.all(playerPromises);
                } catch (error) {
                    console.error(chalk.redBright(`Error on projected player fantasy points cron job. Error: `, error));
                }
            },
        });
    }
}
