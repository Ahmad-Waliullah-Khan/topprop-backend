import { bind, /* inject, */ BindingScope, Getter } from '@loopback/core';
import { repository } from '@loopback/repository';
import { SpreadRepository, PlayerRepository, ContestRepository } from '@src/repositories';
import { MiscHelpers } from '@src/utils/helpers';
import chalk from 'chalk';
import { CONTEST_STATUSES } from '@src/utils/constants';

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
        if(!playerData) {
            console.log(chalk.redBright(`Player with id: ${playerId} not found`));
        }

        const opponentData = await this.playerRepo.findById(opponentId);
        if(!opponentData) {
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
                spreadType:"lobby",
            },
        });

        if (winBonus) {
            cover = entry * 0.85 * (spreadData? spreadData.spreadPay : 0);
        } else {
            cover = entry * (spreadData? spreadData.spreadPay : 0);
        }
        return cover;
    }

    async calculateWinBonus(spread: number, entry: number) {
        let winBonus = 0;
        const spreadData = await this.spreadRepo.findOne({
            order: ['updatedat DESC'],
            where: {
                projectionSpread: spread,
                spreadType:"lobby",
            },
        });
        const MLPay = spreadData? spreadData.mlPay : 0;
        winBonus = entry * 0.15 * MLPay;
        return winBonus;
    }

    async checkPlayerStatus(playerId: number, opponentId: number) {
        const playerData = await this.playerRepo.findById(playerId);
        if(!playerData) {
            console.log(chalk.redBright(`Player with id: ${playerId} not found`));
            return false;
        }

        const opponentData = await this.playerRepo.findById(opponentId);
        if(!opponentData) {
            console.log(chalk.redBright(`Opponent with id: ${opponentId} not found`));
            return false;
        }

        if(playerData.isOver || opponentData.isOver) {
            console.log(chalk.redBright(`Player(s) not available for contest`));
            return false;
        }

        return true;
    }

    async getContestCreationData(
        playerId: number,
        opponentId: number,
        entry: number,
        winBonusFlag: boolean,
        creatorId: number,
        creatorPlayerId : number,
        claimerPlayerId: number,
    ) {
        let spread = 0;
        let cover = 0;
        let winBonus = 0;
        let creatorPlayerCover = 0;
        let claimerPlayerCover = 0;
        let contestData = null;

        const playerData = await this.playerRepo.findById(playerId);
        if(!playerData) {
            console.log(chalk.redBright(`Player with id: ${playerId} not found`));
        }

        const opponentData = await this.playerRepo.findById(opponentId);
        if(!opponentData) {
            console.log(chalk.redBright(`Opponent with id: ${opponentId} not found`));
        }

        const playerProjectedPoints = playerData ? playerData.projectedFantasyPoints : 0;
        const opponentProjectedPoints = opponentData ? opponentData.projectedFantasyPoints : 0;

        const creatorPlayerProjDiff = opponentProjectedPoints - playerProjectedPoints;
        const claimerPlayerProjDiff = playerProjectedPoints - opponentProjectedPoints;

        const creatorPlayerSpreadValue = MiscHelpers.roundValue(opponentProjectedPoints - playerProjectedPoints, 0.5);
        const claimerPlayerSpreadValue = MiscHelpers.roundValue(playerProjectedPoints - opponentProjectedPoints, 0.5);

        const creatorSpreadData = await this.spreadRepo.findOne({
            order: ['updatedat DESC'],
            where: {
                projectionSpread: creatorPlayerSpreadValue,
                spreadType:"lobby",
            },
        });

        const claimerSpreadData = await this.spreadRepo.findOne({
            order: ['updatedat DESC'],
            where: {
                projectionSpread: claimerPlayerSpreadValue,
                spreadType:"lobby",
            },
        });

        if (winBonusFlag) {
            const creatorPlayerCover = entry * 0.85 * (creatorSpreadData? creatorSpreadData.spreadPay : 0);
            const claimerPlayerCover = entry * 0.85 * (claimerSpreadData? claimerSpreadData.spreadPay : 0);
        } else {
            const creatorPlayerCover = entry * (creatorSpreadData? creatorSpreadData.spreadPay : 0);
            const claimerPlayerCover = entry * (claimerSpreadData? claimerSpreadData.spreadPay : 0);
        }

        const spreadValue = entry * 0.85;
        const mlValue = entry - spreadValue;

        const creatorMLPay = creatorSpreadData? creatorSpreadData.mlPay : 0;
        const creatorWinBonus = entry * 0.15 * creatorMLPay;

        const claimerMLPay = claimerSpreadData? claimerSpreadData.mlPay : 0;
        const claimerWinBonus = entry * 0.15 * claimerMLPay;

        const creatorPlayerMaxWin = creatorPlayerCover + creatorWinBonus;
        const claimerPlayerMaxWin = claimerPlayerCover + claimerWinBonus;

        contestData = {
            "creatorId": creatorId,
            "creatorPlayerId" : creatorPlayerId,
            "claimerPlayerId": claimerPlayerId,
            "entry": entry,
            "creatorPlayerProjDiff": creatorPlayerProjDiff,
            "claimerPlayerProjDiff": claimerPlayerProjDiff,
            "creatorPlayerCover": creatorPlayerCover,
            "claimerPlayerCover": claimerPlayerCover,
            "creatorPlayerToWin": creatorWinBonus,
            "claimerPlayerToWin": claimerWinBonus,
            "creatorPlayerMaxWin": creatorPlayerMaxWin,
            "claimerPlayerMaxWin": claimerPlayerMaxWin,
            "creatorPlayerSpreadValue": creatorPlayerSpreadValue,
            "claimerPlayerSpreadValue": claimerPlayerSpreadValue,
            "spreadValue": spreadValue,
            "mlValue": mlValue,
            "status": CONTEST_STATUSES.OPEN,
            "ended": false
        };

        return contestData;
    }
}
