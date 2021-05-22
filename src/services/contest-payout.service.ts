import { bind, /* inject, */ BindingScope, Getter } from '@loopback/core';
import { repository } from '@loopback/repository';
import { ContestPayoutRepository, PlayerRepository } from '@src/repositories';
import { CONTEST_TYPES, DEFAULT_CONTEST_PAYOUTS } from '@src/utils/constants';
import { isEqual } from 'lodash';

@bind({ scope: BindingScope.SINGLETON })
export class ContestPayoutService {
    contestPayoutRepo: ContestPayoutRepository;
    playerRepo: PlayerRepository;

    constructor(
        @repository.getter('ContestPayoutRepository') private contestPayoutRepoGetter: Getter<ContestPayoutRepository>,
        @repository.getter('PlayerRepository') private playerRepoGetter: Getter<PlayerRepository>,
    ) {
        (async () => {
            this.contestPayoutRepo = await this.contestPayoutRepoGetter();
            this.playerRepo = await this.playerRepoGetter();
        })();
    }

    async createDefaults() {
        // await this.contestPayoutRepo.deleteAll();
        for (let index = 0; index < DEFAULT_CONTEST_PAYOUTS.length; index++) {
            const defaultContestPayout = DEFAULT_CONTEST_PAYOUTS[index];
            const contestPayout = await this.contestPayoutRepo.findOne({
                where: { percentLikelihood: defaultContestPayout.percentLikelihood },
            });
            if (contestPayout) {
                await this.contestPayoutRepo.updateById(contestPayout.id, defaultContestPayout);
            } else
                await this.contestPayoutRepo.create({
                    percentLikelihood: defaultContestPayout.percentLikelihood,
                    odds: defaultContestPayout.odds,
                    matchOdds: defaultContestPayout.matchOdds,
                    betPayout: defaultContestPayout.betPayout,
                    matchBetPayout: defaultContestPayout.matchBetPayout,
                    matchPayout: defaultContestPayout.matchPayout,
                });
        }
        console.log(`Default contest payouts upserted`);
    }

    async calculateToWin(
        playerId: number,
        fantasyPoints: number,
        riskAmount: number = 0,
        matching = false,
        type: CONTEST_TYPES,
    ): Promise<number> {
        let toWin = 0;
        try {
            const player = await this.playerRepo.findById(playerId);
            if (!player) return toWin;

            let lookForPercentage = 0;
            let pointsField = `points`;
            let even = fantasyPoints % 2;
            if (isEqual(even, 0)) {
                pointsField += fantasyPoints;
                lookForPercentage = +parseFloat(player[pointsField as 'fantasyPoints'].toString()).toFixed();
            } else {
                let prevPointsField = `points${fantasyPoints - 1}`;
                let nextPointsField = `points${fantasyPoints + 1}`;

                let prevPointsFieldValue = +player[prevPointsField as 'fantasyPoints'];
                let nextPointsFieldValue = +player[nextPointsField as 'fantasyPoints'];
                let avgPointsFields = (prevPointsFieldValue + nextPointsFieldValue) / 2;
                lookForPercentage = +avgPointsFields.toFixed();
            }
            if (isEqual(type, CONTEST_TYPES.UNDER)) lookForPercentage = 100 - lookForPercentage;

            const contestPayout = await this.contestPayoutRepo.findOne({
                where: { percentLikelihood: +lookForPercentage.toFixed() },
            });
            if (!contestPayout) return toWin;

            if (matching) {
                const toWinMatchingK = +contestPayout.matchPayout / 10;
                toWin = toWinMatchingK * riskAmount;
                return toWin;
            } else {
                if (fantasyPoints > 50) return toWin;

                // const player = await this.playerRepo.findById(playerId);
                // if (player) {
                //     let lookForPercentage = 0;
                //     let pointsField = `points`;
                //     let even = fantasyPoints % 2;
                //     if (isEqual(even, 0)) {
                //         pointsField += fantasyPoints;
                //         lookForPercentage = +parseFloat(player[pointsField as 'points0'].toString()).toFixed();
                //     } else {
                //         let prevPointsField = `points${fantasyPoints - 1}`;
                //         let nextPointsField = `points${fantasyPoints + 1}`;

                //         let prevPointsFieldValue = +player[prevPointsField as 'points0'];
                //         let nextPointsFieldValue = +player[nextPointsField as 'points0'];
                //         let avgPointsFields = (prevPointsFieldValue + nextPointsFieldValue) / 2;
                //         lookForPercentage = +avgPointsFields.toFixed();
                //     }

                if (contestPayout) toWin = +contestPayout.betPayout * riskAmount;

                return +toWin;

                /*  {
                    if (inverse) toWin = +contestPayout.inverseBetPayout * riskAmount;
                    else toWin = +contestPayout.betPayout * riskAmount;
                } */
                // }
            }
        } catch (error) {
            console.error(`Error on to win calculation. Error: `, error);
            return toWin;
        }
    }

    async calculateRiskAmountToMatch(
        playerId: number,
        fantasyPoints: number,
        type: CONTEST_TYPES,
        initialRiskAmount: number,
    ): Promise<number> {
        let riskAmountToMatch = 0;
        try {
            const player = await this.playerRepo.findById(playerId);
            if (!player) return riskAmountToMatch;

            let lookForPercentage = 0;
            let pointsField = `points`;
            let even = fantasyPoints % 2;
            if (isEqual(even, 0)) {
                pointsField += fantasyPoints;
                lookForPercentage = +parseFloat(player[pointsField as 'fantasyPoints'].toString()).toFixed();
            } else {
                let prevPointsField = `points${fantasyPoints - 1}`;
                let nextPointsField = `points${fantasyPoints + 1}`;

                let prevPointsFieldValue = +player[prevPointsField as 'fantasyPoints'];
                let nextPointsFieldValue = +player[nextPointsField as 'fantasyPoints'];
                let avgPointsFields = (prevPointsFieldValue + nextPointsFieldValue) / 2;
                lookForPercentage = +avgPointsFields.toFixed();
            }
            if (isEqual(type, CONTEST_TYPES.UNDER)) lookForPercentage = 100 - lookForPercentage;

            const contestPayout = await this.contestPayoutRepo.findOne({
                where: { percentLikelihood: +lookForPercentage.toFixed() },
            });
            if (!contestPayout) return riskAmountToMatch;

            riskAmountToMatch = +contestPayout.matchBetPayout * initialRiskAmount;
            return riskAmountToMatch;
        } catch (error) {
            console.error(`Error on to risk amount to match calculation. Error: `, error);
            return riskAmountToMatch;
        }
    }
}
