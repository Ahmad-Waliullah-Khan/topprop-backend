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
        for (let index = 0; index < NFL_PLAYERS.length; index++) {
            const nflPlayer = NFL_PLAYERS[index];
            const team = await this.teamRepository.findOne({ where: { abbr: nflPlayer.team } });
            if (team) {
                const player = await this.playerRepository.findOne({
                    where: { name: nflPlayer.name, position: nflPlayer.position, teamId: team.id },
                });
                if (player)
                    console.log(chalk.greenBright(`Player: ${nflPlayer.name} for team: ${team.name} already exists`));
                else {
                    await this.playerRepository.create({
                        name: nflPlayer.name,
                        position: nflPlayer.position,
                        teamId: team.id,
                        bc2: nflPlayer.bc2,
                        bc3: nflPlayer.bc3,
                        bc4: nflPlayer.bc4,
                        bc5: nflPlayer.bc5,
                        bc6: nflPlayer.bc6,
                        bc7: nflPlayer.bc7,
                        bc8: nflPlayer.bc8,
                        bc9: nflPlayer.bc9,
                        bc10: nflPlayer.bc10,
                        bc11: nflPlayer.bc11,
                        bc12: nflPlayer.bc12,
                        bc13: nflPlayer.bc13,
                        bc14: nflPlayer.bc14,
                        bc15: nflPlayer.bc15,
                        bc16: nflPlayer.bc16,
                        bc17: nflPlayer.bc17,
                        bc18: nflPlayer.bc18,
                        bc19: nflPlayer.bc19,
                        bc20: nflPlayer.bc20,
                        bc21: nflPlayer.bc21,
                        bc22: nflPlayer.bc22,
                        bc23: nflPlayer.bc23,
                        bc24: nflPlayer.bc24,
                        bc25: nflPlayer.bc25,
                        bc26: nflPlayer.bc26,
                        bc27: nflPlayer.bc27,
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
