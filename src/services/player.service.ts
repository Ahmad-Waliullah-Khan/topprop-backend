import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { PlayerRepository, TeamRepository } from '@src/repositories';
import { NFL_PLAYERS } from '@src/utils/constants';
import chalk from 'chalk';

@bind({ scope: BindingScope.SINGLETON })
export class PlayerService {
    constructor(
        @repository(PlayerRepository) private playerRepository: PlayerRepository,
        @repository(TeamRepository) private teamRepository: TeamRepository,
    ) {}

    async _init() {
        await this.playerRepository.updateAll({ available: false });
        console.log(`All players unavailable`);
        for (let index = 0; index < NFL_PLAYERS.length; index++) {
            const nflPlayer = NFL_PLAYERS[index];
            const team = await this.teamRepository.findOne({ where: { abbr: nflPlayer.team } });
            if (team) {
                const player = await this.playerRepository.findOne({
                    where: {
                        firstName: nflPlayer.name,
                        lastName: nflPlayer.name,
                        position: nflPlayer.position,
                        teamId: team.id,
                    },
                });
                if (player) {
                    await this.playerRepository.updateById(player.id, {
                        available: true,
                        firstName: nflPlayer.name,
                        lastName: nflPlayer.name,
                        position: nflPlayer.position,
                        teamId: team.id,
                    });
                    console.log(chalk.greenBright(`Player: ${nflPlayer.name} updated for team: ${team.name}`));
                } else {
                    await this.playerRepository.create({
                        firstName: nflPlayer.name,
                        lastName: nflPlayer.name,
                        position: nflPlayer.position,
                        teamId: team.id,
                    });
                    console.log(chalk.greenBright(`Player: ${nflPlayer.name} created for team: ${team.name}`));
                }
            } else
                console.log(
                    chalk.greenBright(`Player: ${nflPlayer.name} cannot be created for team: ${nflPlayer.team}`),
                );

            // const team = await this.teamRepository.findOne({ where: { slug: teamSlug } });
            // if (!team) {
            //     await this.teamRepository.create({ league: 'nfl', slug: teamSlug, name: startCase(teamSlug) });
            //     console.log(chalk.greenBright(`Team: ${teamSlug} created.`));
            // } else console.log(chalk.greenBright(`Team: ${teamSlug} already exists.`));
        }
    }
}
