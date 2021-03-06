import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { Gain } from '@src/models';
import {
    ContestRepository,
    CouponCodeRepository,
    GainRepository,
    PlayerRepository,
    UserRepository,
} from '@src/repositories';
import chalk from 'chalk';
import moment from 'moment';
import { CONTEST_STATUSES, CONTEST_STAKEHOLDERS } from '../utils/constants';
import logger from '../utils/logger';

@bind({ scope: BindingScope.SINGLETON })
export class MiscellaneousService {
    constructor(
        @repository(PlayerRepository) private playerRepository: PlayerRepository,
        @repository(GainRepository) private gainRepository: GainRepository,
        @repository(ContestRepository) private contestRepository: ContestRepository,
        @repository('CouponCodeRepository') private couponCodeRepository: CouponCodeRepository,
        @repository('UserRepository') private userRepository: UserRepository,
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

    // misc crons services
    async addPromoCode() {
        /* Date: 1-11-2021
        Description: Added Promo code for Freedman90 for $10 on 15-11-21
        Description: Added Promo code for BeatFreedman for $25 on 01-12-21 */

        const PromoCodeArr = [
            { code: '#BeatFreedman', amount: 2500 },
            { code: 'Beat Freedman', amount: 2500 },
            { code: 'BeatFreedman', amount: 2500 },
        ];

        // check for coupon ,if doesn't exists create one
        PromoCodeArr.map(async ({ code, amount }) => {
            const couponData = await this.couponCodeRepository.find({
                where: {
                    code: code,
                },
            });
            if (!couponData.length) {
                const promoData = {
                    code: code,
                    value: amount,
                };
                await this.couponCodeRepository.create(promoData);
            }
        });
    }

    async updateDOB() {
        /*
        Date: 4-11-2021
        Description: Updates the DOB of parker@carbonfoxdesigns.com to 9/11/1984
        Description: Updates the DOB of cbcrating@yahoo.com to 8/6/1975 */

        const dob = new Date('1975-08-06 00:00:00');
        const formattedDob = moment(dob).format('YYYY-MM-DD HH:mm:ss');

        const user = await this.userRepository.findOne({
            where: {
                email: 'cbcrating@yahoo.com',
            },
        });

        if (user) {
            await this.userRepository.updateById(user?.id, { dateOfBirth: formattedDob });
        }
    }

    async resetAllPlayers() {
        /*
        Date: 10-11-2021
        Description: Resets all player info. Recreates the logic used in fetch player reset functionality

        Reused
        - 2021-11-24
        - 2021-12-01
        */
        this.playerRepository.updateAll(
            {
                isOver: false,
                hasStarted: false,
                projectedFantasyPoints: 0,
                projectedFantasyPointsHalfPpr: 0,
                lastUpdateFrom: 'resetAllPlayers in miscellaneous.service.ts',
            },
            { id: { gt: 0 } },
            (err: any, info: any) => {},
        );
    }

    // update the users who had signed up with freedman90 and got bonusPayoutProcessed to true
    async updateBonusPayoutProcessed() {
        this.userRepository.updateAll(
            { bonusPayoutProcessed: false },
            { promo: { ilike: 'freedman90' } },
            (err: any, info: any) => {},
        );
    }

    async makeAllPlayersAvailable() {
        /*
        Date: 24-11-2021
        Description: Resets all player hasStarted and isOver flag.
        */

        this.playerRepository.updateAll(
            { isOver: false, hasStarted: false, lastUpdateFrom: 'makeAllPlayersAvailable in miscellaneous.service.ts' },
            { id: { gt: 0 } },
            (err: any, info: any) => {},
        );
        logger.info(`Misc cron ran successfully. hasStarted and isOver flag for all players reset successfully`);
    }

    async regradeInjuredPlayersBattlegroundContests() {
        /*
        Date: 07-12-2021
        Description: Resets all contests that were incorrectly graded because the void contest did not get called.
        */

        console.log('contests');

        const sql =
            "SELECT * FROM contest where createdat > '2021-11-30 01:00:00' and (claimerplayerid in(select id From player where projectedFantasypointshalfppr=0) or creatorplayerid in(select id From player where projectedFantasypointshalfppr=0)) and winnerid is not null;";

        const contests = await this.contestRepository.execute(sql, null, null);

        const contestIds = contests.map((contest: { id: number }) => contest.id);

        if (contestIds.length > 0) {
            logger.info(chalk.redBright(`Contests that were graded incorrectly are `, contestIds));

            await this.gainRepository.deleteAll({
                contestId: { inq: contestIds },
                contestType: 'battleground',
            });

            const constestData = {
                winnerId: null,
                topPropProfit: 0,
                status: CONTEST_STATUSES.CLOSED,
                ended: true,
                winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
                creatorWinAmount: 0,
                claimerWinAmount: 0,
            };

            // @ts-ignore
            await this.contestRepository.updateAll(constestData, { id: { inq: contestIds } });

            contestIds.map(async (contestId: number) => {
                const contestData = await this.contestRepository.findById(contestId);

                const entryAmount = Number(contestData.entryAmount);

                const entryGain = new Gain();
                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = contestData.creatorId;
                // entryGain.contenderId = underdog.playerId;
                entryGain.contestId = contestId;

                await this.gainRepository.create(entryGain);

                entryGain.contestType = 'battleground';
                entryGain.amount = Number(entryAmount);
                entryGain.userId = contestData.claimerId;
                // entryGain.contenderId = favorite.playerId;
                entryGain.contestId = contestId;

                await this.gainRepository.create(entryGain);
            });
        }
    }
}
