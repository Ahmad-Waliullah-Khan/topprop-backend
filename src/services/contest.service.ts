import { bind, /* inject, */ BindingScope, Getter } from '@loopback/core';
import { repository } from '@loopback/repository';
import { PlayerResultRepository } from '@src/repositories';
import { MiscHelpers } from '@src/utils/helpers';

@bind({ scope: BindingScope.SINGLETON })
export class ContestService {
    playerResultRepo: PlayerResultRepository;

    constructor(
        @repository.getter('PlayerResultRepository') private playerResultRepoGetter: Getter<PlayerResultRepository>,
    ) {
        (async () => {
            this.playerResultRepo = await this.playerResultRepoGetter();
        })();
    }

    async calculateSpread(playerId: number, opponentId: number, type: string) {
        let spread = 0;

        const playerResult = await this.playerResultRepo.findOne({
            order: ['updatedat DESC'],
            where: {
                playerId: playerId,
            },
        });

        const opponentResult = await this.playerResultRepo.findOne({
            order: ['updatedat DESC'],
            where: {
                playerId: opponentId,
            },
        });
        const playerPoints = playerResult ? playerResult.points : 0;
        const opponentPoints = opponentResult ? opponentResult.points : 0;
        if (type === 'creator') {
            spread = MiscHelpers.roundValue(opponentPoints - playerPoints, 0.5);
        } else {
            spread = MiscHelpers.roundValue(playerPoints - opponentPoints, 0.5);
        }

        return spread;
    }

    async calculateCover(spread: number, entry: number, winBonus: boolean) {
        let cover = 0;
        const spreadPay = 0.9090909091;

        if (winBonus) {
            cover = entry * 0.85 * spreadPay;
        } else {
            cover = entry * spreadPay;
        }
        return cover;
    }

    async calculateWinBonus(spread: number, entry: number) {
        let winBonus = 0;
        const MLPay = 1.25;
        winBonus = entry * 0.15 * MLPay;
        return winBonus;
    }
}
