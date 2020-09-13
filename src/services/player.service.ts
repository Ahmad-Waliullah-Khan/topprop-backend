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
                    where: { name: nflPlayer.name, position: nflPlayer.position, teamId: team.id },
                });
                if (player) {
                    await this.playerRepository.updateById(player.id, {
                        available: true,
                        name: nflPlayer.name,
                        position: nflPlayer.position,
                        teamId: team.id,
                        points0: 100 * nflPlayer.points0,
                        points2: 100 * nflPlayer.points2,
                        points4: 100 * nflPlayer.points4,
                        points6: 100 * nflPlayer.points6,
                        points8: 100 * nflPlayer.points8,
                        points10: 100 * nflPlayer.points10,
                        points12: 100 * nflPlayer.points12,
                        points14: 100 * nflPlayer.points14,
                        points16: 100 * nflPlayer.points16,
                        points18: 100 * nflPlayer.points18,
                        points20: 100 * nflPlayer.points20,
                        points22: 100 * nflPlayer.points22,
                        points24: 100 * nflPlayer.points24,
                        points26: 100 * nflPlayer.points26,
                        points28: 100 * nflPlayer.points28,
                        points30: 100 * nflPlayer.points30,
                        points32: 100 * nflPlayer.points32,
                        points34: 100 * nflPlayer.points34,
                        points36: 100 * nflPlayer.points36,
                        points38: 100 * nflPlayer.points38,
                        points40: 100 * nflPlayer.points40,
                        points42: 100 * nflPlayer.points42,
                        points44: 100 * nflPlayer.points44,
                        points46: 100 * nflPlayer.points46,
                        points48: 100 * nflPlayer.points48,
                        points50: 100 * nflPlayer.points50,
                    });
                    console.log(chalk.greenBright(`Player: ${nflPlayer.name} updated for team: ${team.name}`));
                } else {
                    await this.playerRepository.create({
                        name: nflPlayer.name,
                        position: nflPlayer.position,
                        teamId: team.id,
                        points0: 100 * nflPlayer.points0,
                        points2: 100 * nflPlayer.points2,
                        points4: 100 * nflPlayer.points4,
                        points6: 100 * nflPlayer.points6,
                        points8: 100 * nflPlayer.points8,
                        points10: 100 * nflPlayer.points10,
                        points12: 100 * nflPlayer.points12,
                        points14: 100 * nflPlayer.points14,
                        points16: 100 * nflPlayer.points16,
                        points18: 100 * nflPlayer.points18,
                        points20: 100 * nflPlayer.points20,
                        points22: 100 * nflPlayer.points22,
                        points24: 100 * nflPlayer.points24,
                        points26: 100 * nflPlayer.points26,
                        points28: 100 * nflPlayer.points28,
                        points30: 100 * nflPlayer.points30,
                        points32: 100 * nflPlayer.points32,
                        points34: 100 * nflPlayer.points34,
                        points36: 100 * nflPlayer.points36,
                        points38: 100 * nflPlayer.points38,
                        points40: 100 * nflPlayer.points40,
                        points42: 100 * nflPlayer.points42,
                        points44: 100 * nflPlayer.points44,
                        points46: 100 * nflPlayer.points46,
                        points48: 100 * nflPlayer.points48,
                        points50: 100 * nflPlayer.points50,
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
