import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import {
    BetRepository,
    ContenderRepository,
    ContestRepository,
    GainRepository,
    PlayerResultRepository,
} from '@src/repositories';
import { CONTEST_STATUSES, CONTEST_TYPES, CRON_JOBS } from '@src/utils/constants';
import { isEqual } from 'lodash';
import moment from 'moment';

@cronJob()
export class FakeResultsCron extends CronJob {
    constructor(
        @repository('PlayerResultRepository') private playerResultRepository: PlayerResultRepository,
        @repository('ContestRepository') private contestRepository: ContestRepository,
        @repository('ContenderRepository') private contenderRepository: ContenderRepository,
        @repository('BetRepository') private betRepository: BetRepository,
        @repository('GainRepository') private gainRepository: GainRepository,
    ) {
        super({
            cronTime: '0 * * * * *', // Every hour
            // cronTime: '0 0 * * * *', // Every hour
            name: CRON_JOBS.FAKE_RESULTS_CRON,
            onTick: async () => {
                const contests = await this.contestRepository.find({
                    where: { ended: false, status: { nin: [CONTEST_STATUSES.CLOSED, CONTEST_STATUSES.UNMATCHED] } },
                    include: [{ relation: 'contenders' }],
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
                    }
                    if (isEqual(contest.status, CONTEST_STATUSES.MATCHED)) {
                        const results = await this.playerResultRepository.create({
                            playerId: contest.playerId,
                            points: this.randomIntFromInterval(0, 60),
                        });
                        console.log(`Fake results created.`);
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
                            // const bet = await this.betRepository.findOne({ where: { contenderId: contender.id } });
                            //* TIED IF FANTASY POINTS AND RESULTS POINTS ARE EQUAL
                            if (isEqual(results.points, fantasyPoints)) {
                                await this.contenderRepository.updateById(contender.id, {
                                    tied: true,
                                    tiedAt: moment().toDate(),
                                });
                                console.log(`Contender tied updated.`);
                                await this.gainRepository.create({
                                    amount: +contender.toRiskAmount,
                                    notes: `Contest tied`,
                                    contenderId: contender.id,
                                    userId: contender.contenderId,
                                });
                                console.log(`Gain created on contest tied`);
                            }
                            if (isEqual(contender.type, CONTEST_TYPES.OVER) && results.points > fantasyPoints) {
                                await this.contenderRepository.updateById(contender.id, {
                                    winner: true,
                                    wonAt: moment().toDate(),
                                });
                                console.log(`Contender winner updated.`);
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
            },
            start: true,
        });
    }

    private randomIntFromInterval(min: number, max: number) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}
