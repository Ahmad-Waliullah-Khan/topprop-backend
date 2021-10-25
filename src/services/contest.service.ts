import { bind, /* inject, */ BindingScope, Getter } from '@loopback/core';
import { repository } from '@loopback/repository';
import { SpreadRepository, PlayerRepository, ContestRepository } from '@src/repositories';
import { MiscHelpers } from '@src/utils/helpers';
import chalk from 'chalk';
import moment from 'moment';
import momenttz from 'moment-timezone';
import { CONTEST_STATUSES, BLOCKED_TIME_SLOTS, TIMEZONE, SCHEDULE } from '@src/utils/constants';

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
            cover = entry * 0.85 * (spreadData ? spreadData.spreadPay : 0);
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

        const currentTime = momenttz().tz(TIMEZONE).add(1, 'minute');
        // const currentTime = momenttz.tz('2021-10-24T12:30:00', TIMEZONE).add(1, 'minute');
        const currentDay = currentTime.day();
        const clonedCurrentTime = currentTime.clone();
        let startOfGameWeek = clonedCurrentTime.day(4).startOf('day');
        if (currentDay < 3) {
            startOfGameWeek = clonedCurrentTime.day(-3).startOf('day');
        }

        const sheduledGames = SCHEDULE.filter(scheduledGame => {
            const gameDate = momenttz.tz(scheduledGame.dateTime, TIMEZONE);
            return gameDate.isBetween(startOfGameWeek, currentTime, 'minute');
        });

        let teamList: string[] = [];

        sheduledGames.forEach(scheduledGame => {
            if (scheduledGame.awayTeam) {
                teamList.push(scheduledGame.awayTeam);
            }
            if (scheduledGame.homeTeam) {
                teamList.push(scheduledGame.homeTeam);
            }
        });
        
        if(teamList.includes(playerData.teamName) || teamList.includes(opponentData.teamName)){
            console.log(chalk.redBright(`Player(s) not available for contest`));
            return false;
        }


        return true;
    }

    async checkIfValidTimeslot() {
        const currentTime = moment();
    }
}
