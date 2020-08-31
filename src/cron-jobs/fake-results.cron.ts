import { CronJob, cronJob } from '@loopback/cron';
import { repository } from '@loopback/repository';
import { ContenderRepository, ContestRepository, PlayerResultRepository } from '@src/repositories';
import { CONTEST_STATUSES, CONTEST_TYPES } from '@src/utils/constants';
import { isEqual } from 'lodash';
import moment from 'moment';

@cronJob()
export class FakeResultsCron extends CronJob {
    constructor(
        @repository('PlayerResultRepository') private playerResultRepository: PlayerResultRepository,
        @repository('ContestRepository') private contestRepository: ContestRepository,
        @repository('ContenderRepository') private contenderRepository: ContenderRepository,
    ) {
        super({
            cronTime: '0 * * * * *', // Every minute
            name: 'fake-results',
            onTick: async () => {
                const contests = await this.contestRepository.find({
                    where: { ended: false, status: { nin: [CONTEST_STATUSES.CLOSED, CONTEST_STATUSES.UNMATCHED] } },
                    include: [{ relation: 'contenders' }],
                });
                console.log(this.randomIntFromInterval(0, 60));
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
                            //TODO NEED TO CHECK EQUALITY
                            if (isEqual(contender.type, CONTEST_TYPES.OVER) && results.points > fantasyPoints) {
                                await this.contenderRepository.updateById(contender.id, { winner: true });
                                console.log(`Contender winner updated.`);
                            }
                        }
                    }
                }
                // console.log(users);
            },
            start: true,
        });
    }

    private randomIntFromInterval(min: number, max: number) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}
