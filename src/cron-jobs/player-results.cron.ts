import { service } from '@loopback/core';
import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { PlayerResult } from '@src/models';
import {
    BetRepository,
    ContenderRepository,
    ContestRepository,
    GainRepository,
    PlayerResultRepository,
} from '@src/repositories';
import { SportsDataService } from '@src/services';
import { CONTEST_SCORING_OPTIONS, CONTEST_STATUSES, CONTEST_TYPES, CRON_JOBS } from '@src/utils/constants';
import chalk from 'chalk';
import { find, isEqual } from 'lodash';
import moment from 'moment';

@cronJob()
export class PlayerResultsCron extends CronJob {
    constructor(
        @repository('PlayerResultRepository') private playerResultRepository: PlayerResultRepository,
        @repository('ContestRepository') private contestRepository: ContestRepository,
        @repository('ContenderRepository') private contenderRepository: ContenderRepository,
        @repository('BetRepository') private betRepository: BetRepository,
        @repository('GainRepository') private gainRepository: GainRepository,
        @service() private sportsDataService: SportsDataService,
    ) {
        super({
            // cronTime: '0 * * * * *', // Every minute
            cronTime: '0 */30 * * * *', // Every 30 min
            name: CRON_JOBS.PLAYER_RESULTS_CRON,
            onTick: async () => {
                try {
                    // console.log(`*****************************RUN PLAYERS RESULTS CRON*****************************`);
                    const fantasyScoringResults = await this.sportsDataService.fantasyPointsByDate(moment());
                    const filteredFantasyScoringResults = fantasyScoringResults.filter(result => result.IsOver);

                    const contests = await this.contestRepository.find({
                        where: { ended: false, status: { nin: [CONTEST_STATUSES.CLOSED, CONTEST_STATUSES.UNMATCHED] } },
                        include: [{ relation: 'contenders' }, { relation: 'player' }],
                    });
                    for (let index = 0; index < contests.length; index++) {
                        const contest = contests[index];
                        if (isEqual(contest.status, CONTEST_STATUSES.OPEN)) {
                            await this.contestRepository.updateById(contest.id, {
                                status: CONTEST_STATUSES.UNMATCHED,
                                ended: true,
                                endedAt: moment().toDate(),
                            });
                            console.log(`Contest marked as unmatched.`);

                            const contender = contest.contenders[0];

                            await this.gainRepository.create({
                                amount: +contender.toRiskAmount,
                                notes: `Contest unmatched`,
                                contenderId: contender.id,
                                userId: contender.contenderId,
                            });
                            console.log(`Gain created on contest unmatched`);
                        }
                        if (isEqual(contest.status, CONTEST_STATUSES.MATCHED)) {
                            const foundScoreResult = find(filteredFantasyScoringResults, score =>
                                isEqual(score.PlayerID, contest.player?.remoteId),
                            );
                            let results: PlayerResult | null = null;
                            if (foundScoreResult) {
                                let points: number = isEqual(contest.scoring, CONTEST_SCORING_OPTIONS.STD)
                                    ? foundScoreResult.FantasyPoints
                                    : isEqual(contest.scoring, CONTEST_SCORING_OPTIONS.PPR)
                                    ? foundScoreResult.FantasyPointsPPR
                                    : foundScoreResult.FantasyPointsFanDuel;

                                results = await this.playerResultRepository.create({
                                    playerId: contest.playerId,
                                    points,
                                });
                                console.log(`Result created.`);
                            }

                            await this.contestRepository.updateById(contest.id, {
                                status: CONTEST_STATUSES.CLOSED,
                                ended: true,
                                endedAt: moment().toDate(),
                            });
                            console.log(`Contest marked as closed.`);

                            const fantasyPoints = +contest.fantasyPoints;
                            //* DEFINE WINNER AND LOOSER
                            for (let index = 0; index < contest.contenders.length; index++) {
                                const contender = contest.contenders[index];
                                //* TIED IF FANTASY POINTS AND RESULTS POINTS ARE EQUAL OR NOT FANTASY SCORE FOUND
                                if (isEqual(results && results.points, fantasyPoints) || !foundScoreResult) {
                                    await this.contenderRepository.updateById(contender.id, {
                                        tied: true,
                                        tiedAt: moment().toDate(),
                                        tiedReason: !foundScoreResult ? `Fantasy score not found` : null,
                                    });
                                    console.log(`Contender tied updated.`);
                                    await this.gainRepository.create({
                                        amount: +contender.toRiskAmount,
                                        notes: !foundScoreResult
                                            ? `Contest tied. Fantasy score not found.`
                                            : `Contest tied.`,
                                        contenderId: contender.id,
                                        userId: contender.contenderId,
                                    });
                                    console.log(`Gain created on contest tied`);
                                }
                                if (
                                    (isEqual(contender.type, CONTEST_TYPES.OVER) &&
                                        results &&
                                        results.points > fantasyPoints) ||
                                    (isEqual(contender.type, CONTEST_TYPES.UNDER) &&
                                        results &&
                                        results.points < fantasyPoints)
                                ) {
                                    await this.contenderRepository.updateById(contender.id, {
                                        winner: true,
                                        wonAt: moment().toDate(),
                                    });
                                    console.log(`Contender winner updated: ${contender.contenderId}`);
                                    await this.gainRepository.create({
                                        contenderId: contender.id,
                                        userId: contender.contenderId,
                                        amount: +contender.toRiskAmount,
                                    });
                                    console.log(`Gain created on contest won. Return initial bet.`);
                                    await this.gainRepository.create({
                                        contenderId: contender.id,
                                        userId: contender.contenderId,
                                        amount: +contender.toWinAmount,
                                    });
                                    console.log(`Gain created on contest won. Win amount.`);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(chalk.redBright(`Error on player results cron. Error: `, error));
                }
            },
            start: true,
        });
    }

    private randomIntFromInterval(min: number, max: number) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}
