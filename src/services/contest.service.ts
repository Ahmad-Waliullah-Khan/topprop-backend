import { bind, /* inject, */ BindingScope, Getter } from '@loopback/core';
import { repository } from '@loopback/repository';
import { SpreadRepository, PlayerRepository, ContestRepository } from '@src/repositories';
import { MiscHelpers } from '@src/utils/helpers';
import chalk from 'chalk';
import { CONTEST_STATUSES } from '@src/utils/constants';

import { Contest } from '@src/models';

@bind({ scope: BindingScope.SINGLETON })
export class ContestService {
    playerRepo: PlayerRepository;
    spreadRepo: SpreadRepository;

    constructor(
        @repository.getter('PlayerRepository') private playerRepoGetter: Getter<PlayerRepository>,
        @repository.getter('SpreadRepository') private spreadRepoGetter: Getter<SpreadRepository>,
    ) {
        (async () => {
            this.playerRepo = await this.playerRepoGetter();
            this.spreadRepo = await this.spreadRepoGetter();
        })();
    }

    async calculateSpread(playerId: number, opponentId: number, type: string) {
        let spread = 0;

        const playerData = await this.playerRepo.findById(playerId);
        if (!playerData) {
            console.log(chalk.redBright(`Player with id: ${playerId} not found`));
        }

        const opponentData = await this.playerRepo.findById(opponentId);
        if (!opponentData) {
            console.log(chalk.redBright(`Opponent with id: ${opponentId} not found`));
        }

        const playerProjectedPoints = playerData ? playerData.projectedFantasyPoints : 0;
        const opponentProjectedPoints = opponentData ? opponentData.projectedFantasyPoints : 0;
        if (type === 'creator') {
            spread = MiscHelpers.roundValue(opponentProjectedPoints - playerProjectedPoints, 0.5);
        } else {
            spread = MiscHelpers.roundValue(playerProjectedPoints - opponentProjectedPoints, 0.5);
        }

        return spread;
    }

    async calculateCover(spread: number, entry: number, winBonus: boolean) {
        let cover = 0;
        const spreadData = await this.spreadRepo.findOne({
            order: ['updatedat DESC'],
            where: {
                projectionSpread: spread,
                spreadType: 'lobby',
            },
        });
        
        if (winBonus) {
            cover = (entry * 0.85) * (spreadData ? spreadData.spreadPay : 0);
        } else {
            cover = entry * (spreadData ? spreadData.spreadPay : 0);
        }
        return cover;
    }

    async calculateWinBonus(spread: number, entry: number) {
        let winBonus = 0;
        const spreadData = await this.spreadRepo.findOne({
            order: ['updatedat DESC'],
            where: {
                projectionSpread: spread,
                spreadType: 'lobby',
            },
        });
        const MLPay = spreadData ? spreadData.mlPay : 0;
        winBonus = entry * 0.15 * MLPay;
        return winBonus;
    }

    async checkPlayerStatus(playerId: number, opponentId: number) {
        const playerData = await this.playerRepo.findById(playerId);
        if (!playerData) {
            console.log(chalk.redBright(`Player with id: ${playerId} not found`));
            return false;
        }

        const opponentData = await this.playerRepo.findById(opponentId);
        if (!opponentData) {
            console.log(chalk.redBright(`Opponent with id: ${opponentId} not found`));
            return false;
        }

        if (playerData.isOver || opponentData.isOver) {
            console.log(chalk.redBright(`Player(s) not available for contest`));
            return false;
        }

        return true;
    }
}
