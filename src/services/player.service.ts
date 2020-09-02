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
                        points0: nflPlayer.points0,
                        points2: nflPlayer.points2,
                        points4: nflPlayer.points4,
                        points6: nflPlayer.points6,
                        points8: nflPlayer.points8,
                        points10: nflPlayer.points10,
                        points12: nflPlayer.points12,
                        points14: nflPlayer.points14,
                        points16: nflPlayer.points16,
                        points18: nflPlayer.points18,
                        points20: nflPlayer.points20,
                        points22: nflPlayer.points22,
                        points24: nflPlayer.points24,
                        points26: nflPlayer.points26,
                        points28: nflPlayer.points28,
                        points30: nflPlayer.points30,
                        points32: nflPlayer.points32,
                        points34: nflPlayer.points34,
                        points36: nflPlayer.points36,
                        points38: nflPlayer.points38,
                        points40: nflPlayer.points40,
                        points42: nflPlayer.points42,
                        points44: nflPlayer.points44,
                        points46: nflPlayer.points46,
                        points48: nflPlayer.points48,
                        points50: nflPlayer.points50,
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
