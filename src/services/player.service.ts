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
                        points0: nflPlayer.points0 as number,
                        points2: nflPlayer.points2 as number,
                        points4: nflPlayer.points4 as number,
                        points6: nflPlayer.points6 as number,
                        points8: nflPlayer.points8 as number,
                        points10: nflPlayer.points10 as number,
                        points12: nflPlayer.points12 as number,
                        points14: nflPlayer.points14 as number,
                        points16: nflPlayer.points16 as number,
                        points18: nflPlayer.points18 as number,
                        points20: nflPlayer.points20 as number,
                        points22: nflPlayer.points22 as number,
                        points24: nflPlayer.points24 as number,
                        points26: nflPlayer.points26 as number,
                        points28: nflPlayer.points28 as number,
                        points30: nflPlayer.points30 as number,
                        points32: nflPlayer.points32 as number,
                        points34: nflPlayer.points34 as number,
                        points36: nflPlayer.points36 as number,
                        points38: nflPlayer.points38 as number,
                        points40: nflPlayer.points40 as number,
                        points42: nflPlayer.points42 as number,
                        points44: nflPlayer.points44 as number,
                        points46: nflPlayer.points46 as number,
                        points48: nflPlayer.points48 as number,
                        points50: nflPlayer.points50 as number,
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
