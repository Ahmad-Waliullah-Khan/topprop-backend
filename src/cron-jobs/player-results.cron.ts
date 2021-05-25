// import { service } from '@loopback/core';
// import { CronJob, cronJob } from '@loopback/cron';
// import { repository } from '@loopback/repository';
// import {
//     ContenderRepository,
//     ContestRepository,
//     GainRepository,
//     GameRepository,
//     PlayerResultRepository,
// } from '@src/repositories';
// import { SportsDataService } from '@src/services';
// import {
//     CONTEST_SCORING_OPTIONS,
//     CONTEST_STATUSES,
//     CONTEST_TYPES,
//     CRON_JOBS,
//     MAX_ATTEMPT_RETRIES,
// } from '@src/utils/constants';
// import chalk from 'chalk';
// import { find, isEqual } from 'lodash';
// import moment from 'moment';

// @cronJob()
// export class PlayerResultsCron extends CronJob {
//     constructor(
//         @repository('PlayerResultRepository') private playerResultRepository: PlayerResultRepository,
//         @repository('ContestRepository') private contestRepository: ContestRepository,
//         @repository('ContenderRepository') private contenderRepository: ContenderRepository,
//         @repository('GameRepository') private gameRepository: GameRepository,
//         @repository('GainRepository') private gainRepository: GainRepository,
//         @service() private sportsDataService: SportsDataService,
//     ) {
//         super({
//             cronTime: isEqual(process.env.NODE_ENV, 'local') ? '0 * * * * *' : '0 */15 * * * *',
//             name: CRON_JOBS.PLAYER_RESULTS_CRON,
//             onTick: async () => {
//                 try {
//                     console.log(`*****************************RUN PLAYERS RESULTS CRON*****************************`);
//                     console.log(`${moment().toLocaleString()}`);
//                     const currentWeekSchedule = await this.sportsDataService.currentWeekSchedule();
//                     const finishedRemoteGames = currentWeekSchedule.filter(
//                         game => isEqual(game.Status, 'Final') || isEqual(game.Status, 'F/OT'),
//                     );

//                     const finishedRemoteGameIds = finishedRemoteGames.map(remoteGame => remoteGame.GlobalGameID);

//                     const finishedGames = await this.gameRepository.find({
//                         where: { remoteId: { inq: finishedRemoteGameIds } },
//                     });
//                     const finishedGameIds = finishedGames.map(game => game.id);

//                     const fantasyScoringResults = await this.sportsDataService.fantasyPointsByDate(moment());
//                     const filteredFantasyScoringResults = fantasyScoringResults.filter(result => result.IsOver);

//                     const contests = await this.contestRepository.find({
//                         where: {
//                             gameId: { inq: finishedGameIds },
//                             ended: false,
//                             status: { nin: [CONTEST_STATUSES.CLOSED, CONTEST_STATUSES.UNMATCHED] },
//                             fetchResultsAttemptsExceeded: false,
//                         },
//                         include: [{ relation: 'contenders' }, { relation: 'player' }, { relation: 'game' }],
//                     });
//                     for (let index = 0; index < contests.length; index++) {
//                         const contest = contests[index];

//                         if (isEqual(contest.status, CONTEST_STATUSES.OPEN)) {
//                             await this.contestRepository.updateById(contest.id, {
//                                 status: CONTEST_STATUSES.UNMATCHED,
//                                 ended: true,
//                                 endedAt: moment().toDate(),
//                             });
//                             console.log(`Contest marked as unmatched.`);

//                             const contender = contest.contenders[0];

//                             await this.gainRepository.create({
//                                 amount: +contender.toRiskAmount,
//                                 notes: `Contest unmatched`,
//                                 contenderId: contender.id,
//                                 userId: contender.contenderId,
//                             });
//                             console.log(`Gain created on contest unmatched`);
//                         }
//                         if (isEqual(contest.status, CONTEST_STATUSES.MATCHED)) {
//                             const foundScoreResult = find(filteredFantasyScoringResults, score =>
//                                 isEqual(score.PlayerID, contest.player?.remoteId),
//                             );
//                             if (foundScoreResult) {
//                                 let points: number = isEqual(contest.scoring, CONTEST_SCORING_OPTIONS.STD)
//                                     ? foundScoreResult.FantasyPoints
//                                     : isEqual(contest.scoring, CONTEST_SCORING_OPTIONS.PPR)
//                                     ? foundScoreResult.FantasyPointsPPR
//                                     : foundScoreResult.FantasyPointsFanDuel;

//                                 const results = await this.playerResultRepository.create({
//                                     playerId: contest.playerId,
//                                     points,
//                                 });
//                                 console.log(`Result created.`);
//                                 await this.contestRepository.updateById(contest.id, {
//                                     status: CONTEST_STATUSES.CLOSED,
//                                     ended: true,
//                                     endedAt: moment().toDate(),
//                                     retryFetchResults: false,
//                                 });
//                                 console.log(`Contest marked as closed.`);

//                                 const fantasyPoints = +contest.fantasyPoints;
//                                 //* DEFINE WINNER AND LOOSER
//                                 for (let index = 0; index < contest.contenders.length; index++) {
//                                     const contender = contest.contenders[index];
//                                     //* TIED IF FANTASY POINTS AND RESULTS POINTS ARE EQUAL
//                                     if (isEqual(results.points, fantasyPoints)) {
//                                         await this.contenderRepository.updateById(contender.id, {
//                                             tied: true,
//                                             tiedAt: moment().toDate(),
//                                             tiedReason: 'Fantasy points are the same of the contest',
//                                         });
//                                         console.log(`Contender tied updated.`);
//                                         await this.gainRepository.create({
//                                             amount: +contender.toRiskAmount,
//                                             notes: `Contest tied.`,
//                                             contenderId: contender.id,
//                                             userId: contender.contenderId,
//                                         });
//                                         console.log(`Gain created on contest tied`);
//                                     }
//                                     if (
//                                         (isEqual(contender.type, CONTEST_TYPES.OVER) &&
//                                             results &&
//                                             results.points > fantasyPoints) ||
//                                         (isEqual(contender.type, CONTEST_TYPES.UNDER) &&
//                                             results &&
//                                             results.points < fantasyPoints)
//                                     ) {
//                                         await this.contenderRepository.updateById(contender.id, {
//                                             winner: true,
//                                             wonAt: moment().toDate(),
//                                             tied: false,
//                                             tiedAt: null,
//                                             tiedReason: null,
//                                         });
//                                         console.log(`Contender winner updated: ${contender.contenderId}`);
//                                         await this.gainRepository.create({
//                                             contenderId: contender.id,
//                                             userId: contender.contenderId,
//                                             amount: +contender.toRiskAmount,
//                                         });
//                                         console.log(`Gain created on contest won. Return initial bet.`);
//                                         await this.gainRepository.create({
//                                             contenderId: contender.id,
//                                             userId: contender.contenderId,
//                                             amount: +contender.toWinAmount,
//                                         });
//                                         console.log(`Gain created on contest won. Win amount.`);
//                                     }
//                                 }
//                             } else {
//                                 if (contest.fetchResultsAttemptsExceeded) continue;

//                                 let fetchRetryAttempts = (contest.fetchResultsAttempts || 0) + 1;
//                                 await this.contestRepository.updateById(contest.id, {
//                                     retryFetchResults: true,
//                                     fetchResultsAttempts: fetchRetryAttempts,
//                                 });

//                                 if (fetchRetryAttempts >= MAX_ATTEMPT_RETRIES) {
//                                     await this.contestRepository.updateById(contest.id, {
//                                         retryFetchResults: false,
//                                         fetchResultsAttempts: fetchRetryAttempts,
//                                         fetchResultsAttemptsExceeded: true,
//                                     });
//                                     for (let index = 0; index < contest.contenders.length; index++) {
//                                         const contender = contest.contenders[index];

//                                         //* TIED IF NOT FANTASY SCORE FOUND AFTER 3 RETRY ATTEMPTS
//                                         await this.contenderRepository.updateById(contender.id, {
//                                             tied: true,
//                                             tiedAt: moment().toDate(),
//                                             tiedReason: `Fantasy score not found after 3 retry attempts`,
//                                         });
//                                         console.log(
//                                             `Contender tied updated. Fantasy score not found after 3 retry attempts.`,
//                                         );
//                                         await this.gainRepository.create({
//                                             amount: +contender.toRiskAmount,
//                                             notes: `Contest tied. Fantasy score not found after 3 retry attempts`,
//                                             contenderId: contender.id,
//                                             userId: contender.contenderId,
//                                         });
//                                         console.log(
//                                             `Gain created on contest tied. Fantasy score not found after 3 retry attempts.`,
//                                         );
//                                     }
//                                     await this.contestRepository.updateById(contest.id, {
//                                         status: CONTEST_STATUSES.CLOSED,
//                                         ended: true,
//                                         endedAt: moment().toDate(),
//                                     });
//                                     console.log(
//                                         `Contest marked as closed. Fantasy score not found after 3 retry attempts.`,
//                                     );
//                                 }
//                             }
//                         }
//                     }
//                     //* MARK GAMES AS FINISHED (IF APPLIES)
//                     finishedGameIds.length &&
//                         (await this.gameRepository.updateAll({ finished: true }, { id: { inq: finishedGameIds } }));
//                 } catch (error) {
//                     console.error(chalk.redBright(`Error on player results cron. Error: `, error));
//                 }
//             },
//             start: true,
//         });
//     }

//     private randomIntFromInterval(min: number, max: number) {
//         // min and max included
//         return Math.floor(Math.random() * (max - min + 1) + min);
//     }
// }
