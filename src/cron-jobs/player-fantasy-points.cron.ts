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
export class PlayerFantasyPointsCron extends CronJob {
    constructor(
        @repository('PlayerRepository') private playerRepository: PlayerRepository,
        @service() private sportsDataService: SportsDataService,
        @service() private cronService: CronService,
    ) {
        super({
            cronTime: '0 */1 * * * *',
            name: CRON_JOBS.PLAYER_FANTASY_POINTS_CRON,
            start: true,
            onTick: async () => {
                try {
                    const currentDate = await this.cronService.fetchDate();
                    const remotePlayers = await this.sportsDataService.fantasyPointsByDate(currentDate);
                    const localPlayers = await this.playerRepository.find();
                    const playerPromises = remotePlayers.map(async remotePlayer => {
                        const foundLocalPlayer = localPlayers.find(
                            localPlayer => remotePlayer.PlayerID === localPlayer.remoteId,
                        );
                        if (foundLocalPlayer) {
                            foundLocalPlayer.hasStarted = remotePlayer.HasStarted;
                            foundLocalPlayer.isOver = remotePlayer.IsOver;
                            foundLocalPlayer.fantasyPoints = remotePlayer.FantasyPoints;
                            await this.playerRepository.save(foundLocalPlayer);
                        }
                    });
                    console.log(
                        'Running Fetch Fantasy Points Cron finished at',
                        moment().format('DD-MM-YYYY hh:mm:ss a'),
                    );
                    if (RUN_TYPE === 'principle') {
                        const updatedCronTime = new cron.CronTime('0 2/6 * * * *');
                        this.setTime(updatedCronTime);
                        this.start();
                    } else {
                        const updatedCronTime = new cron.CronTime('0 */15 * * * *');
                        this.setTime(updatedCronTime);
                        this.start();
                    }

                    Promise.all(playerPromises);
                } catch (error) {
                    console.error(chalk.redBright(`Error on player fantasy points cron job. Error: `, error));
                }
            },
        });
    }
}
