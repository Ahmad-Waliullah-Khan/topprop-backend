import { service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { CronJob, cronJob } from '@loopback/cron';
import { CRON_JOBS } from '@src/utils/constants';
import cron from 'cron';

import { TimeframeRepository } from '@src/repositories';

import { SportsDataService, TIMEFRAMES } from '@src/services';
import { Timeframe } from '@src/models';

import moment from 'moment';
import chalk from 'chalk';

import { RUN_TYPE } from '../utils/constants';

@cronJob()
export class TimeframeCron extends CronJob {
    constructor(
        @repository('TimeframeRepository') private timeframeRepository: TimeframeRepository,
        @service() private sportsDataService: SportsDataService,
    ) {
        super({
            cronTime: '0 */1 * * * *',
            name: CRON_JOBS.PLAYERS_CRON,
            onTick: async () => {
                console.log('Running Timeframe Cron at ', moment().format('DD-MM-YYYY hh:mm:ss a'));
                try {
                    const remoteTimeframes = await this.sportsDataService.timeFrames(TIMEFRAMES.ALL);
                    const localTimeframes = await this.timeframeRepository.find();
                    const playerPromises = remoteTimeframes.map(async remoteTimeframe => {
                        const foundLocalTimeframe = localTimeframes.find(localTimeframe => {
                            return moment(remoteTimeframe.StartDate).isSame(localTimeframe.startDate);
                        });
                        if (!foundLocalTimeframe) {
                            const newTimeframe = new Timeframe();
                            newTimeframe.seasonType = remoteTimeframe.SeasonType;
                            newTimeframe.season = remoteTimeframe.Season;
                            newTimeframe.week = remoteTimeframe.Week;
                            newTimeframe.name = remoteTimeframe.Name;
                            newTimeframe.shortName = remoteTimeframe.ShortName;
                            newTimeframe.startDate = remoteTimeframe.StartDate;
                            newTimeframe.endDate = remoteTimeframe.EndDate;
                            newTimeframe.firstGameStart = remoteTimeframe.FirstGameStart;
                            newTimeframe.firstGameEnd = remoteTimeframe.FirstGameEnd;
                            newTimeframe.lastGameEnd = remoteTimeframe.LastGameEnd;
                            newTimeframe.hasGames = remoteTimeframe.HasGames;
                            newTimeframe.hasStarted = remoteTimeframe.HasStarted;
                            newTimeframe.hasEnded = remoteTimeframe.HasEnded;
                            newTimeframe.hasFirstGameStarted = remoteTimeframe.HasFirstGameStarted;
                            newTimeframe.hasFirstGameEnded = remoteTimeframe.HasFirstGameEnded;
                            newTimeframe.hasLastGameEnded = remoteTimeframe.HasLastGameEnded;
                            newTimeframe.apiSeason = remoteTimeframe.ApiSeason;
                            newTimeframe.apiWeek = remoteTimeframe.ApiWeek;
                            await this.timeframeRepository.create(newTimeframe);
                        }
                    });

                    if (RUN_TYPE === 'principle') {
                        const updatedCronTime = new cron.CronTime('0 0 0 */15 * *');
                        this.setTime(updatedCronTime);
                        this.start();
                    } else {
                        const updatedCronTime = new cron.CronTime('0 0 */1 * * *');
                        this.setTime(updatedCronTime);
                        this.start();
                    }

                    Promise.all(playerPromises);
                } catch (error) {
                    console.error(chalk.redBright(`Error on timeframe cron job. Error: `, error));
                }
            },
        });
    }
}
