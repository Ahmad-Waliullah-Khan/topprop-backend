import { service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { CronJob, cronJob } from '@loopback/cron';
import { CRON_JOBS } from '@src/utils/constants';

import { PlayerRepository } from '@src/repositories';

import { SportsDataService, CronService } from '@src/services';
import { Player } from '@src/models';

@cronJob()
export class PlayersCron extends CronJob {
    constructor(
        @repository('PlayerRepository') private playerRepository: PlayerRepository,
        @service() private sportsDataService: SportsDataService,
    ) {
        super({
            cronTime: '0 0/30 * * * *', // Every 30 minute interval
            // cronTime: '0 * * * * *', // Every 30 minute interval
            name: CRON_JOBS.PLAYERS_CRON,
            onTick: async () => {
                console.log("Running Player Cron");
                const remotePlayers = await this.sportsDataService.availablePlayers();
                const localPlayers = await this.playerRepository.find();
                const playerPromises = remotePlayers.map(async remotePlayer => {
                    const foundLocalPlayer = localPlayers.find(
                        localPlayer => remotePlayer.PlayerID === localPlayer.remoteId,
                    );
                    if (foundLocalPlayer) {
                        foundLocalPlayer.photoUrl = remotePlayer.PhotoUrl;
                        foundLocalPlayer.status = remotePlayer.Status;
                        foundLocalPlayer.available = remotePlayer.Active;
                        foundLocalPlayer.teamName = remotePlayer.Team;
                        await this.playerRepository.save(foundLocalPlayer);
                    } else {
                        const newLocalPlayer = new Player();
                        newLocalPlayer.remoteId = remotePlayer.PlayerID;
                        newLocalPlayer.photoUrl = remotePlayer.PhotoUrl;
                        newLocalPlayer.firstName = remotePlayer.FirstName;
                        newLocalPlayer.lastName = remotePlayer.LastName;
                        newLocalPlayer.fullName = `${remotePlayer.FirstName} ${remotePlayer.LastName}`;
                        newLocalPlayer.shortName = remotePlayer.ShortName;
                        newLocalPlayer.status = remotePlayer.Status;
                        newLocalPlayer.available = remotePlayer.Active;
                        newLocalPlayer.position = remotePlayer.Position;
                        newLocalPlayer.teamName = remotePlayer.Team;
                        newLocalPlayer.teamId = remotePlayer.TeamID;
                        await this.playerRepository.create(newLocalPlayer);
                    }
                });
                Promise.all(playerPromises);
            },
            start: false,
        });
    }
}
