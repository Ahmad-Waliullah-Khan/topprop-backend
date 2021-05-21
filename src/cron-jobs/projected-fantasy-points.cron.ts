import { service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { CronJob, cronJob } from '@loopback/cron';
import { CRON_JOBS } from '@src/utils/constants';

import { PlayerRepository } from '@src/repositories';

import { SportsDataService, CronService } from '@src/services';

@cronJob()
export class ProjectedFantasyPointsCron extends CronJob {
    constructor(
        @repository('PlayerRepository') private playerRepository: PlayerRepository,
        @service() private sportsDataService: SportsDataService,
        @service() private cronService: CronService,
    ) {
        super({
            cronTime: '0 */3 * * * *', // Every 3rd minute
            name: CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON,
            onTick: async () => {
                console.log('Running Fetch Fantasy Projections Cron');
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
                Promise.all(playerPromises);
            },
            start: true,
        });
    }
}
