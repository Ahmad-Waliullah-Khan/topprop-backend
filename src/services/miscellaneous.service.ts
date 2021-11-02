import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { PlayerRepository, GainRepository, ContestRepository } from '@src/repositories';
import { CONTEST_STATUSES } from '../utils/constants';
import chalk from 'chalk';
import logger from '../utils/logger';

@bind({ scope: BindingScope.SINGLETON })
export class MiscellaneousService {
    constructor(
        @repository(PlayerRepository) private playerRepository: PlayerRepository,
        @repository(GainRepository) private gainRepository: GainRepository,
        @repository(ContestRepository) private contestRepository: ContestRepository,
    ) {}

    async resetIncorrectlyGradedContests() {
        /* 
        Date: 1-10-2021
        Description: This was run to reset contests that were 
        incorrectly graded because of not coercing data 
        fetched from the DB to a number before comparison */

        console.log('contests');

        const sql =
            "select id from contest where ended=true and claimerid is not null and ((creatorplayerfantasypoints + creatorplayerspread > claimerplayerfantasypoints and winnerlabel='claimer') or (creatorplayerfantasypoints + creatorplayerspread < claimerplayerfantasypoints and winnerlabel='creator'))";

        const contests = await this.contestRepository.execute(sql, null, null);

        const contestIds = contests.map((contest: { id: number }) => contest.id);

        if (contestIds.length > 0) {
            logger.info(chalk.redBright(`Contests that were graded incorrectly are `, contestIds));

            // const gains = await this.gainRepository.find({
            //     where: {
            //         contestId: { inq: contestIds },

            //     },
            // });

            await this.gainRepository.deleteAll({
                contestId: { inq: contestIds },
                contestType: 'battleground',
            });

            const constestData = {
                winnerId: null,
                topPropProfit: 0,
                status: CONTEST_STATUSES.MATCHED,
                ended: false,
                endedAt: null,
                winnerLabel: null,
                creatorWinAmount: null,
                claimerWinAmount: null,
                creatorPlayerFantasyPoints: 0,
                claimerPlayerFantasyPoints: 0,
            };

            // @ts-ignore
            await this.contestRepository.updateAll(constestData, { id: { inq: contestIds } });
        }
    }

    async resetNoPPRGradedContests() {
        /* 
        Date: 1-10-2021
        Description: This was run to reset contests that were 
        graded according to noPPR logic instead of halfPPR */

        const sql =
            "select id from contest where ended=true and claimerid is not null and createdat > '2021-10-27 00:00:00'";

        const contests = await this.contestRepository.execute(sql, null, null);
        

        const contestIds = contests.map((contest: { id: number }) => contest.id);

        if (contestIds.length > 0) {
            logger.info(chalk.redBright(`Contests that were graded incorrectly are `, contestIds));

            // const gains = await this.gainRepository.find({
            //     where: { contestId: { inq: contestIds }, contestType: 'battleground' },
            // });

            await this.gainRepository.deleteAll({
                contestId: { inq: contestIds },
                contestType: "battleground",
            });

            const constestData = {
                winnerId: null,
                topPropProfit: 0,
                status: CONTEST_STATUSES.MATCHED,
                ended: false,
                endedAt: null,
                winnerLabel: null,
                creatorWinAmount: null,
                claimerWinAmount: null,
                creatorPlayerFantasyPoints: 0,
                claimerPlayerFantasyPoints: 0,
            };

            // @ts-ignore
            await this.contestRepository.updateAll(constestData, { id: { inq: contestIds } });
        }
    }
}
