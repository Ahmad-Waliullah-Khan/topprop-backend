import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { GameRepository, TeamRepository } from '@src/repositories';
import { SportsDataService } from '@src/services';
import { CRON_JOBS, GAME_TYPES } from '@src/utils/constants';
import chalk from 'chalk';
import { isEqual } from 'lodash';

@cronJob()
export class SyncGamesCron extends CronJob {
    constructor(
        @repository('GameRepository') private gameRepo: GameRepository,
        @repository('TeamRepository') private teamRepo: TeamRepository,
        @service() private sportDataService: SportsDataService,
    ) {
        super({
            // cronTime: '0 * * * * *', // Every minute
            cronTime: '0 15 * * * *', // Every day at 23 hrs
            name: CRON_JOBS.SYNC_GAMES_CRON,
            onTick: async () => {
                try {
                    const season = await this.sportDataService.currentSeason();
                    const currentWeek = await this.sportDataService.currentWeek();
                    const seasonSchedule = await this.sportDataService.scheduleBySeason(season);
                    const currentWeekSchedule = seasonSchedule.filter(
                        game => isEqual(game.Week, currentWeek) && !isEqual(game.Status, 'Postponed'),
                    );

                    for (let index = 0; index < currentWeekSchedule.length; index++) {
                        const remoteGame = currentWeekSchedule[index];
                        const visitorTeam = await this.teamRepo.findOne({
                            where: { remoteId: remoteGame.GlobalAwayTeamID },
                        });
                        const homeTeam = await this.teamRepo.findOne({
                            where: { remoteId: remoteGame.GlobalHomeTeamID },
                        });

                        if (visitorTeam && homeTeam) {
                            const game = await this.gameRepo.findOne({
                                where: {
                                    visitorTeamId: visitorTeam.id,
                                    homeTeamId: homeTeam.id,
                                    type: GAME_TYPES.NFL,
                                    week: currentWeek,
                                },
                            });
                            if (game)
                                console.log(
                                    chalk.greenBright(`Game: ${visitorTeam.abbr} @ ${homeTeam.abbr} already exists`),
                                );
                            else {
                                await this.gameRepo.create({
                                    visitorTeamId: visitorTeam.id,
                                    homeTeamId: homeTeam.id,
                                    type: GAME_TYPES.NFL,
                                    week: currentWeek,
                                    startTime: remoteGame.DateTime,
                                    season: remoteGame.Season,
                                    remoteId: remoteGame.GlobalGameID,
                                });
                                console.log(chalk.greenBright(`Game: ${visitorTeam.abbr} @ ${homeTeam.abbr} created`));
                            }
                        }
                        if (!visitorTeam)
                            console.log(
                                chalk.greenBright(
                                    `Visitor team for ${remoteGame.AwayTeam} could not be found. Team could be in the BYE week.`,
                                ),
                            );
                        if (!homeTeam)
                            console.log(
                                chalk.greenBright(
                                    `Home team for ${remoteGame.HomeTeam} could not be found. Team could be in the BYE week.`,
                                ),
                            );
                    }
                } catch (error) {
                    console.error(chalk.redBright(`Error on sync team cron job. Error: `, error));
                }
            },
            start: true,
        });
    }
}
