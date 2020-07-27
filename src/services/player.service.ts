import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { PlayerRepository } from '@src/repositories';

@bind({ scope: BindingScope.SINGLETON })
export class PlayerService {
    constructor(@repository(PlayerRepository) private playerRepository: PlayerRepository) {}

    async _init() {
        // for (let index = 0; index < values(NFL_TEAMS).length; index++) {
        //     const teamSlug = values(NFL_TEAMS)[index];
        //     const team = await this.teamRepository.findOne({ where: { slug: teamSlug } });
        //     if (!team) {
        //         await this.teamRepository.create({ league: 'nfl', slug: teamSlug, name: startCase(teamSlug) });
        //         console.log(chalk.greenBright(`Team: ${teamSlug} created.`));
        //     } else console.log(chalk.greenBright(`Team: ${teamSlug} already exists.`));
        // }
    }
}
