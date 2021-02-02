import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { GameRepository, TeamRepository } from '@src/repositories';
import { GAME_TYPES, NFL_WEEK_1 } from '@src/utils/constants';
import chalk from 'chalk';
import moment from 'moment';

@bind({ scope: BindingScope.SINGLETON })
export class GameService {
    constructor(
        @repository(GameRepository) private gameRepository: GameRepository,
        @repository(TeamRepository) private teamRepository: TeamRepository,
    ) {}

    async _init() {
        for (let index = 0; index < NFL_WEEK_1.length; index++) {
            const nflGame = NFL_WEEK_1[index];
            const visitorTeam = await this.teamRepository.findOne({ where: { abbr: nflGame.visitorTeam } });
            const homeTeam = await this.teamRepository.findOne({ where: { abbr: nflGame.homeTeam } });
            if (visitorTeam && homeTeam) {
                const game = await this.gameRepository.findOne({
                    where: {
                        visitorTeamId: visitorTeam.id,
                        homeTeamId: homeTeam.id,
                        type: GAME_TYPES.NFL,
                        week: 1,
                    },
                });
                if (game) console.log(chalk.greenBright(`Game: ${visitorTeam.abbr} @ ${homeTeam.abbr} already exists`));
                else {
                    await this.gameRepository.create({
                        visitorTeamId: visitorTeam.id,
                        homeTeamId: homeTeam.id,
                        type: GAME_TYPES.NFL,
                        week: 1,
                        startTime: moment(nflGame.startTime),
                    });
                    console.log(chalk.greenBright(`Game: ${visitorTeam.abbr} @ ${homeTeam.abbr} created`));
                }
            }
            if (!visitorTeam)
                console.log(chalk.greenBright(`Visitor team for ${nflGame.visitorTeam} could not be found.`));
            if (!homeTeam) console.log(chalk.greenBright(`Home team for ${nflGame.homeTeam} could not be found.`));
        }
    }
}
