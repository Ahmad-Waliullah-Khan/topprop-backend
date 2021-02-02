import { Getter, inject, service } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { ContestPayoutService } from '@src/services/contest-payout.service';
import { SportsDataService } from '@src/services/sports-data.service';
import { GAME_MESSAGES, PLAYER_MESSAGES, TEAM_MESSAGES } from '@src/utils/messages';
import { find, isEqual } from 'lodash';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Contender, Contest, ContestRelations, Game, Player, User } from '../models';
import { ContenderRepository } from './contender.repository';
import { GainRepository } from './gain.repository';
import { GameRepository } from './game.repository';
import { PlayerRepository } from './player.repository';
import { UserRepository } from './user.repository';

export class ContestRepository extends DefaultCrudRepository<Contest, typeof Contest.prototype.id, ContestRelations> {
    public readonly player: BelongsToAccessor<Player, typeof Contest.prototype.id>;

    public readonly game: BelongsToAccessor<Game, typeof Contest.prototype.id>;

    public readonly contenders: HasManyRepositoryFactory<Contender, typeof Contest.prototype.id>;

    public readonly creator: BelongsToAccessor<User, typeof Contest.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
        @repository.getter('GameRepository') protected gameRepositoryGetter: Getter<GameRepository>,
        @repository.getter('ContenderRepository') protected contenderRepositoryGetter: Getter<ContenderRepository>,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('GainRepository') protected gainRepositoryGetter: Getter<GainRepository>,
        @service() private sportsDataService: SportsDataService,
        @service() private contestPayoutService: ContestPayoutService,
    ) {
        super(Contest, dataSource);
        this.creator = this.createBelongsToAccessorFor('creator', userRepositoryGetter);
        this.registerInclusionResolver('creator', this.creator.inclusionResolver);
        this.contenders = this.createHasManyRepositoryFactoryFor('contenders', contenderRepositoryGetter);
        this.registerInclusionResolver('contenders', this.contenders.inclusionResolver);
        this.game = this.createBelongsToAccessorFor('game', gameRepositoryGetter);
        this.registerInclusionResolver('game', this.game.inclusionResolver);
        this.player = this.createBelongsToAccessorFor('player', playerRepositoryGetter);
        this.registerInclusionResolver('player', this.player.inclusionResolver);

        /* (async () => {
            const openContests = await this.find({
                where: { status: CONTEST_STATUSES.OPEN },
                include: [
                    {
                        relation: 'contenders',
                    },
                ],
            });
            for (let index = 0; index < openContests.length; index++) {
                const element = openContests[index];
                const riskAmountToMatch = await this.contestPayoutService.calculateRiskAmountToMatch(
                    element.playerId,
                    +element.fantasyPoints,
                    element.contenders[0].type,
                    +element.contenders[0].toRiskAmount,
                );

                await this.updateById(element.id, { maxRiskAmount: +riskAmountToMatch });
            }
            console.log('done');
        })();
 */
        //* BEFORE SAVE HOOK
        //* ASSIGN UPDATED AT
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
        //* VALIDATE PLAYER EXISTENCE
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipPlayerValidation) {
                const playerRepository = await this.playerRepositoryGetter();
                if (!(await playerRepository.exists(ctx.instance.playerId)))
                    throw new HttpErrors.NotFound(PLAYER_MESSAGES.PLAYER_NOT_FOUND);
                ctx.hookState.skipPlayerValidation = true;
            }
            return;
        });

        //* VALIDATE GAME EXISTENCE & STATUS
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.options.skipGameValidation && !ctx.hookState.skipGameValidation) {
                const gameRepository = await this.gameRepositoryGetter();
                if (!(await gameRepository.exists(ctx.instance.gameId)))
                    throw new HttpErrors.NotFound(GAME_MESSAGES.GAME_NOT_FOUND);

                const game = await gameRepository.findById(ctx.instance.gameId);
                const filteredSchedule = await this.sportsDataService.currentWeekSchedule();

                const remoteGame = find(filteredSchedule, remoteGame =>
                    isEqual(remoteGame.GlobalGameID, game.remoteId),
                );
                if (!remoteGame) throw new HttpErrors.NotFound(GAME_MESSAGES.GAME_NOT_FOUND);
                if (!isEqual(remoteGame.Status, 'Scheduled'))
                    throw new HttpErrors.BadRequest(GAME_MESSAGES.INVALID_GAME_STATUS(remoteGame.Status));

                ctx.hookState.skipGameValidation = true;
            }
            return;
        });

        //* VALIDATE IF PLAYER BELONG TO ANY OF THE TEAMS
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipTeamPlayerValidation) {
                const gameRepository = await this.gameRepositoryGetter();
                const playerRepository = await this.playerRepositoryGetter();
                const game = await gameRepository.findById(ctx.instance.gameId);
                const player = await playerRepository.findById(ctx.instance.playerId);

                const visitorTeamId = game.visitorTeamId;
                const homeTeamId = game.homeTeamId;

                if (!isEqual(player.teamId, visitorTeamId) && !isEqual(player.teamId, homeTeamId))
                    throw new HttpErrors.BadRequest(TEAM_MESSAGES.TEAM_INVALID_PLAYER);
                ctx.hookState.skipTeamPlayerValidation = true;
            }
            return;
        });

        //* AFTER SAVE HOOK
        //* CREATE FIRST CONTENDER INSTANCE
        this.modelClass.observe('after save', async ctx => {
            if (
                ctx.instance &&
                ctx.isNewInstance &&
                ctx.options.creatorId &&
                ctx.options.contestType &&
                ctx.options.toRiskAmount &&
                ctx.options.toWinAmount &&
                ctx.options.assignMAxRiskAmount &&
                !ctx.hookState.skipInitialContenderCreation
            ) {
                const contenderRepository = await this.contenderRepositoryGetter();
                await contenderRepository.create(
                    {
                        contenderId: ctx.options.creatorId,
                        contestId: ctx.instance.id,
                        type: ctx.options.contestType,
                        creator: true,
                        toRiskAmount: ctx.options.toRiskAmount,
                        toWinAmount: ctx.options.toWinAmount,
                    },
                    { fromContest: true },
                );

                const riskAmountToMatch = await this.contestPayoutService.calculateRiskAmountToMatch(
                    ctx.instance.playerId,
                    +ctx.instance.fantasyPoints,
                    ctx.options.contestType,
                    +ctx.options.toRiskAmount,
                );
                await this.updateById(ctx.instance.id, { maxRiskAmount: +riskAmountToMatch });
                ctx.hookState.skipInitialContenderCreation = true;
            }
            return;
        });

        //* MANAGE REFUNDS IF CONTESt CLOSED & WHEN IMPORT PLAYERS
        this.modelClass.observe('after save', async ctx => {
            if (ctx.instance && ctx.options.refundBets && !ctx.hookState.skipRefundBetsByPlayersImport) {
                const contest = await this.findById(ctx.instance.id, { include: [{ relation: 'contenders' }] });
                const contenderRepo = await this.contenderRepositoryGetter();
                const gainRepo = await this.gainRepositoryGetter();
                for (let index = 0; index < contest.contenders.length; index++) {
                    const contender = contest.contenders[index];

                    await contenderRepo.updateById(contender.id, {
                        canceled: true,
                        canceledAt: moment().toDate(),
                        canceledReason: `Player unavailable.`,
                    });
                    console.log(`Contender tied updated.`);
                    await gainRepo.create({
                        amount: +contender.toRiskAmount,
                        notes: `Contest tied. Player unavailable.`,
                        contenderId: contender.id,
                        userId: contender.contenderId,
                    });
                    console.log(`Gain created on contest tied by player unavailable.`);
                }
                ctx.hookState.skipRefundBetsByPlayersImport = true;
            }
            return;
        });
    }
}
