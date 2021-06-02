import { authenticate } from '@loopback/authentication';
import { service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { authorize } from '@loopback/authorization';
import { get, HttpErrors } from '@loopback/rest';

import { ContestRepository, PlayerRepository, GainRepository } from '@src/repositories';
import { CronService, SportsDataService } from '@src/services';

import { API_ENDPOINTS, CONTEST_STATUSES, CONTEST_STAKEHOLDERS, PERMISSIONS, RUN_TYPE } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { CRON_MESSAGES } from '@src/utils/messages';

import chalk from 'chalk';
import { Bet, Gain } from '@src/models';
import moment from 'moment';

// import {inject} from '@loopback/core';

export class CronController {
    constructor(
        @repository('PlayerRepository') private playerRepository: PlayerRepository,
        @repository('ContestRepository') private contestRepository: ContestRepository,
        @repository('GainRepository') private gainRepository: GainRepository,
        @service() private sportsDataService: SportsDataService,
        @service() private cronService: CronService,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.FETCH_PROJECTIONS, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async fetchProjecttion(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === 'principle') throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);

        const currentDate = await this.cronService.fetchDate();
        const remotePlayers = await this.sportsDataService.projectedFantasyPointsByPlayer(currentDate);
        const localPlayers = await this.playerRepository.find();
        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
                foundLocalPlayer.hasStarted = false;
                foundLocalPlayer.isOver = false;
                foundLocalPlayer.opponentName = remotePlayer.Opponent;
                foundLocalPlayer.homeOrAway = remotePlayer.HomeOrAway;
                foundLocalPlayer.projectedFantasyPoints = remotePlayer.ProjectedFantasyPoints;
                await this.playerRepository.save(foundLocalPlayer);
            }
        });

        Promise.all(playerPromises);
        return { data: 'Fetched Projections' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.FETCH_POINTS, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async fetchPoints(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === 'principle') throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);

        const currentDate = await this.cronService.fetchDate();
        const remotePlayers = await this.sportsDataService.fantasyPointsByDate(currentDate);
        const localPlayers = await this.playerRepository.find();
        const playerPromises = remotePlayers.map(async remotePlayer => {
            const foundLocalPlayer = localPlayers.find(localPlayer => remotePlayer.PlayerID === localPlayer.remoteId);
            if (foundLocalPlayer) {
                foundLocalPlayer.hasStarted = remotePlayer.HasStarted;
                foundLocalPlayer.isOver = remotePlayer.IsOver;
                foundLocalPlayer.fantasyPoints = remotePlayer.FantasyPoints;
                await this.playerRepository.save(foundLocalPlayer);
            }
        });

        Promise.all(playerPromises);
        return { data: 'Fetched Points' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.WIN_CHECK, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async winCheck(): Promise<ICommonHttpResponse> {
        const favorite = {
            type: CONTEST_STAKEHOLDERS.PENDING,
            gameWin: false,
            coversSpread: false,
            winBonus: false,
            netEarnings: 0,
            playerWinBonus: 0,
            playerMaxWin: 0,
            playerCover: 0,
            playerSpread: 0,
            playerId: 0,
            userId: 0,
            fantasyPoints: 0,
            projectedFantasyPoints: 0,
        };

        const underdog = {
            type: CONTEST_STAKEHOLDERS.PENDING,
            gameWin: false,
            coversSpread: false,
            winBonus: false,
            netEarnings: 0,
            playerWinBonus: 0,
            playerMaxWin: 0,
            playerCover: 0,
            playerSpread: 0,
            playerId: 0,
            userId: 0,
            fantasyPoints: 0,
            projectedFantasyPoints: 0,
        };

        try {
            const contests = await this.contestRepository.find({
                where: {
                    status: CONTEST_STATUSES.MATCHED,
                    ended: false,
                },
                include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
            });

            const filteredContests = contests.filter(contest => {
                return contest.creatorPlayer?.isOver && contest.claimerPlayer?.isOver;
            });

            filteredContests.map(async contest => {
                const entryAmount = Number(contest.entryAmount);
                const mlValue = Number(contest.mlValue);
                const spreadValue = Number(contest.spreadValue);
                let topPropProfit = 0;
                let winner = '';

                if (contest.creatorPlayerSpread < contest.claimerPlayerSpread) {
                    favorite.type = CONTEST_STAKEHOLDERS.CREATOR;
                    favorite.playerWinBonus = contest.creatorPlayerWinBonus;
                    favorite.playerMaxWin = contest.creatorPlayerMaxWin;
                    favorite.playerCover = contest.creatorPlayerCover;
                    favorite.playerSpread = contest.creatorPlayerSpread;
                    favorite.userId = contest.creatorId;
                    favorite.playerId = contest.creatorPlayerId;
                    favorite.fantasyPoints = contest.creatorPlayer ? contest.creatorPlayer.fantasyPoints : 0;
                    favorite.projectedFantasyPoints = contest.creatorPlayer
                        ? contest.creatorPlayer.projectedFantasyPoints
                        : 0;

                    underdog.type = CONTEST_STAKEHOLDERS.CLAIMER;
                    underdog.playerWinBonus = contest.claimerPlayerWinBonus;
                    underdog.playerMaxWin = contest.claimerPlayerMaxWin;
                    underdog.playerCover = contest.claimerPlayerCover;
                    underdog.playerSpread = contest.claimerPlayerSpread;
                    underdog.userId = contest.claimerId;
                    underdog.playerId = contest.claimerPlayerId;
                    underdog.fantasyPoints = contest.claimerPlayer ? contest.claimerPlayer.fantasyPoints : 0;
                    underdog.projectedFantasyPoints = contest.claimerPlayer
                        ? contest.claimerPlayer.projectedFantasyPoints
                        : 0;
                } else {
                    underdog.type = CONTEST_STAKEHOLDERS.CREATOR;
                    underdog.playerWinBonus = contest.creatorPlayerWinBonus;
                    underdog.playerMaxWin = contest.creatorPlayerMaxWin;
                    underdog.playerCover = contest.creatorPlayerCover;
                    underdog.playerSpread = contest.creatorPlayerSpread;
                    underdog.userId = contest.creatorId;
                    underdog.playerId = contest.creatorPlayerId;
                    underdog.fantasyPoints = contest.creatorPlayer ? contest.creatorPlayer.fantasyPoints : 0;
                    underdog.projectedFantasyPoints = contest.creatorPlayer
                        ? contest.creatorPlayer.projectedFantasyPoints
                        : 0;

                    favorite.type = CONTEST_STAKEHOLDERS.CLAIMER;
                    favorite.playerWinBonus = contest.claimerPlayerWinBonus;
                    favorite.playerMaxWin = contest.claimerPlayerMaxWin;
                    favorite.playerCover = contest.claimerPlayerCover;
                    favorite.playerSpread = contest.claimerPlayerSpread;
                    favorite.userId = contest.claimerId;
                    favorite.playerId = contest.claimerPlayerId;
                    favorite.fantasyPoints = contest.claimerPlayer ? contest.claimerPlayer.fantasyPoints : 0;
                    favorite.projectedFantasyPoints = contest.claimerPlayer
                        ? contest.claimerPlayer.projectedFantasyPoints
                        : 0;
                }

                // TEST BENCH START
                // favorite.fantasyPoints = 6;
                // underdog.fantasyPoints = 3;
                // TEST BENCH END

                favorite.gameWin = favorite.fantasyPoints > underdog.fantasyPoints;
                underdog.gameWin = underdog.fantasyPoints >= favorite.fantasyPoints;

                favorite.coversSpread = favorite.fantasyPoints - underdog.playerSpread > underdog.fantasyPoints;
                underdog.coversSpread = underdog.fantasyPoints + underdog.playerSpread > favorite.fantasyPoints;

                favorite.winBonus = favorite.playerWinBonus > 0;
                underdog.winBonus = underdog.fantasyPoints > 0;

                if (favorite.gameWin && favorite.coversSpread) {
                    // Row 1 & 2 of wiki combination table
                    favorite.netEarnings = favorite.playerMaxWin;
                    underdog.netEarnings = -entryAmount;
                    topPropProfit = entryAmount - favorite.playerMaxWin;
                    winner = 'favorite';
                }

                if (underdog.gameWin && underdog.coversSpread) {
                    // Row 3 & 4 of wiki combination table
                    favorite.netEarnings = -entryAmount;
                    underdog.netEarnings = underdog.playerMaxWin;
                    topPropProfit = entryAmount - underdog.playerMaxWin;
                    winner = 'underdog';
                }

                if (favorite.gameWin && !favorite.coversSpread) {
                    // Row 5 & 6 of wiki combination table
                    favorite.netEarnings = -entryAmount + Number(favorite.playerWinBonus) + mlValue;
                    underdog.netEarnings = favorite.playerCover - mlValue;
                    topPropProfit = -(underdog.netEarnings + favorite.netEarnings);
                    winner = 'underdog';
                }

                if (!favorite.coversSpread && !underdog.coversSpread) {
                    // Draw
                    favorite.netEarnings = entryAmount;
                    underdog.netEarnings = entryAmount;
                    topPropProfit = 0;
                    winner = 'push';
                }

                // console.log('🚀 ~ favorite.netEarnings', favorite.netEarnings);
                // console.log('🚀 ~ underdog.netEarnings', underdog.netEarnings);

                // console.log('🚀 topPropProfit', topPropProfit);
                // console.log('🚀 winner', winner);

                // console.log("==================================");
                // console.log("==================================");

                // console.log('🚀 ~ favorite', favorite);
                // console.log('🚀 ~ underdog', underdog);

                if (winner === 'push') {
                    const constestData = {
                        topPropProfit: topPropProfit,
                        status: CONTEST_STATUSES.CLOSED,
                        ended: true,
                        endedAt: moment(),
                        winnerLabel: CONTEST_STAKEHOLDERS.PUSH,
                        creatorWinAmount: 0,
                        claimerWinAmount: 0,
                    };

                    await this.contestRepository.updateById(contest.id, constestData);

                    const entryGain = new Gain();

                    entryGain.amount = Number(entryAmount) * 100;
                    entryGain.userId = favorite.userId;
                    entryGain.contenderId = underdog.playerId;

                    // console.log('🚀 ~ refund data for favorite', entryGain);

                    await this.gainRepository.create(entryGain);

                    entryGain.amount = Number(entryAmount) * 100;
                    entryGain.userId = underdog.userId;
                    entryGain.contenderId = favorite.playerId;

                    // console.log('🚀 ~ refund data for underdog', entryGain);

                    await this.gainRepository.create(entryGain);
                } else {
                    const winnerId = winner === 'favorite' ? favorite.userId : underdog.userId;
                    const winnerLabel = winner === 'favorite' ? favorite.type : underdog.type;
                    const creatorWinAmount =
                        favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? favorite.netEarnings : underdog.netEarnings;

                    const claimerWinAmount =
                        favorite.type === CONTEST_STAKEHOLDERS.CREATOR ? underdog.netEarnings : favorite.netEarnings;

                    const constestData = {
                        winnerId: winnerId,
                        topPropProfit: topPropProfit,
                        status: CONTEST_STATUSES.CLOSED,
                        ended: true,
                        endedAt: moment(),
                        winnerLabel: winnerLabel,
                        creatorWinAmount: creatorWinAmount,
                        claimerWinAmount: claimerWinAmount,
                    };

                    await this.contestRepository.updateById(contest.id, constestData);

                    const userId = winner === 'favorite' ? favorite.userId : underdog.userId;
                    const contenderId = winner === 'favorite' ? underdog.playerId : favorite.playerId;
                    const winningAmount = winner === 'favorite' ? favorite.netEarnings : underdog.netEarnings;
                    const entryGain = new Gain();

                    entryGain.amount = Number(entryAmount) * 100;
                    entryGain.userId = userId;
                    entryGain.contenderId = contenderId;

                    // console.log('🚀 ~ gainData (Entry Amount)', entryGain);

                    await this.gainRepository.create(entryGain);

                    const winningGain = new Gain();

                    winningGain.amount = Number(winningAmount) * 100;
                    winningGain.userId = userId;
                    winningGain.contenderId = contenderId;

                    // console.log('🚀 ~ gainData (Winning Amount)', winningGain);

                    await this.gainRepository.create(winningGain);
                }
            });

            /* TODO 
            - [X] Seach for contests
            - [X] Filter through contests
            - [X] assign favorite and underdog
            - [X] draw logic ( both spreadsCover will be false )
            - [X] win logic
            - [X] draw logic
            - [X] update contest
            - [X] add entry to gains table for winner exactly how bet table entry is added for create and claim contest
            */

            return { data: filteredContests };
        } catch (error) {
            console.error(chalk.redBright(`Error on win criteria cron job. Error: `, error));
        }

        return { data: 'Win Check' };
    }
}
