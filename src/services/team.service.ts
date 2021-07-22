import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { TeamRepository } from '@src/repositories';
import { NFL_TEAMS } from '@src/utils/constants';
import chalk from 'chalk';
import { startCase } from 'lodash';

@bind({ scope: BindingScope.SINGLETON })
export class TeamService {
    constructor(@repository(TeamRepository) private teamRepository: TeamRepository) {}

    async _init() {
        for (let index = 0; index < NFL_TEAMS.length; index++) {
            const nflTeam = NFL_TEAMS[index];
            const team = await this.teamRepository.findOne({ where: { slug: nflTeam.slug } });
            if (!team) {
                await this.teamRepository.create({
                    // league: 'nfl',
                    slug: nflTeam.slug,
                    name: startCase(nflTeam.slug),
                    abbr: nflTeam.abbr,
                });
                console.log(chalk.greenBright(`Team: ${nflTeam.slug} created.`));
            } else console.log(chalk.greenBright(`Team: ${nflTeam.slug} already exists.`));
        }
    }
}
