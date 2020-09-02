import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { ContestPayoutRepository, PlayerRepository } from '@src/repositories';
import { DEFAULT_CONTEST_PAYOUTS } from '@src/utils/constants';
import { isEqual } from 'lodash';

@bind({ scope: BindingScope.TRANSIENT })
export class ContestPayoutService {
    constructor(
        @repository('ContestPayoutRepository') private contestPayoutRepo: ContestPayoutRepository,
        @repository('PlayerRepository') private playerRepo: PlayerRepository,
    ) {}

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
                    inverseOdds: defaultContestPayout.inverseOdds,
                    betPayout: defaultContestPayout.betPayout,
                    inverseBetPayout: defaultContestPayout.inverseBetPayout,
                    inversePayout: defaultContestPayout.inversePayout,
                });
        }
        console.log(`Default contest payouts upserted`);
    }

    async calculateToWin(
        playerId: number,
        fantasyPoints: number,
        riskAmount: number,
        inverse = false,
    ): Promise<number> {
        let toWin = 0;
        const player = await this.playerRepo.findById(playerId);
        if (player) {
            let lookForPercentage = 0;
            let pointsField = `points`;
            let even = fantasyPoints % 2;
            if (isEqual(even, 0)) {
                pointsField += fantasyPoints;
                lookForPercentage = +parseFloat(player[pointsField as 'points0'].toString()).toFixed();
            } else {
                let prevPointsField = `points${fantasyPoints - 1}`;
                let nextPointsField = `points${fantasyPoints + 1}`;

                let prevPointsFieldValue = +player[prevPointsField as 'points0'];
                let nextPointsFieldValue = +player[nextPointsField as 'points0'];
                let avgPointsFields = (prevPointsFieldValue + nextPointsFieldValue) / 2;
                lookForPercentage = +avgPointsFields.toFixed();
            }

            const contestPayout = await this.contestPayoutRepo.findOne({
                where: { percentLikelihood: +lookForPercentage.toFixed() },
            });
            if (contestPayout) {
                if (inverse) toWin = +contestPayout.inverseBetPayout * riskAmount;
                else toWin = +contestPayout.betPayout * riskAmount;
            }
        }

        return +toWin;
    }
}
