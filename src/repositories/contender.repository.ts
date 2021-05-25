import { Getter, inject, service } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { SportsDataService } from '@src/services/sports-data.service';
import { CONTEST_STATUSES } from '@src/utils/constants';
import { CONTENDER_MESSAGES, GAME_MESSAGES } from '@src/utils/messages';
import { find, isEqual } from 'lodash';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Contender, ContenderRelations, Contest, User } from '../models';
import { BetRepository } from './bet.repository';
import { ContestRepository } from './contest.repository';
import { UserRepository } from './user.repository';

export class ContenderRepository extends DefaultCrudRepository<
    Contender,
    typeof Contender.prototype.id,
    ContenderRelations
> {
    public readonly contest: BelongsToAccessor<Contest, typeof Contender.prototype.id>;
    public readonly contender: BelongsToAccessor<User, typeof Contender.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('ContestRepository') protected contestRepositoryGetter: Getter<ContestRepository>,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('BetRepository') protected betRepositoryGetter: Getter<BetRepository>,
        @service() private sportsDataService: SportsDataService,
    ) {
        super(Contender, dataSource);
        this.contender = this.createBelongsToAccessorFor('contender', userRepositoryGetter);
        this.registerInclusionResolver('contender', this.contender.inclusionResolver);
        this.contest = this.createBelongsToAccessorFor('contest', contestRepositoryGetter);
        this.registerInclusionResolver('contest', this.contest.inclusionResolver);

        //* BEFORE SAVE HOOK
        //* ASSIGN UPDATED AT
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });

        //* VERIFY GAME STATUS
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipGameStatusValidation) {
                const contestRepo = await this.contestRepositoryGetter();
                const contest = await contestRepo.findById(ctx.instance.contestId, { include: [{ relation: 'game' }] });

                // const currentWeek = await this.sportsDataService.currentWeek();
                const filteredSchedule = await this.sportsDataService.currentWeekSchedule();

                // const filteredSchedule = schedule.filter(remoteGame => isEqual(remoteGame.Week, currentWeek));

                const remoteGame = find(filteredSchedule, remoteGame =>
                    isEqual(remoteGame.GlobalGameID, contest.spreadId),
                );
                if (!remoteGame) throw new HttpErrors.NotFound(GAME_MESSAGES.GAME_NOT_FOUND);
                if (!isEqual(remoteGame.Status, 'Scheduled'))
                    throw new HttpErrors.BadRequest(GAME_MESSAGES.INVALID_GAME_STATUS(remoteGame.Status));

                ctx.hookState.skipGameStatusValidation = true;
            }
            return;
        });

        //* VERIFY DUPLICATED CONTENDERS
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipDuplicatesValidation) {
                const duplicatedCreatorsCount = await this.count({
                    contenderId: ctx.instance.contenderId,
                    contestId: ctx.instance.contestId,
                });
                if (duplicatedCreatorsCount.count)
                    throw new HttpErrors.BadRequest(CONTENDER_MESSAGES.CONTENDER_INVALID);

                const duplicatedTypesCount = await this.count({
                    type: ctx.instance.type,
                    contestId: ctx.instance.contestId,
                });
                if (duplicatedTypesCount.count)
                    throw new HttpErrors.BadRequest(CONTENDER_MESSAGES.CONTENDER_ALREADY_EXISTS);
                ctx.hookState.skipDuplicatesValidation = true;
            }
            return;
        });
        //* VALIDATE CONTENDER BALANCE
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipDuplicatesValidation) {
                const duplicatedCreatorsCount = await this.count({
                    contenderId: ctx.instance.contenderId,
                    contestId: ctx.instance.contestId,
                });
                if (duplicatedCreatorsCount.count)
                    throw new HttpErrors.BadRequest(CONTENDER_MESSAGES.CONTENDER_INVALID);

                const duplicatedTypesCount = await this.count({
                    type: ctx.instance.type,
                    contestId: ctx.instance.contestId,
                });
                if (duplicatedTypesCount.count)
                    throw new HttpErrors.BadRequest(CONTENDER_MESSAGES.CONTENDER_ALREADY_EXISTS);
                ctx.hookState.skipDuplicatesValidation = true;
            }
            return;
        });

        //* AFTER SAVE HOOK
        //* MATCH CONTEST
        this.modelClass.observe('after save', async ctx => {
            if (ctx.instance && ctx.options.matched && !ctx.hookState.skipContestMatch) {
                const contestRepository = await this.contestRepositoryGetter();

                const contest = await contestRepository.findById(ctx.instance.contestId, {
                    include: [{ relation: 'contenders' }],
                });

                let topPropRevenue = 0;
                // if (contest.contenders.length == 2) {
                //     let creatorContender = find(contest.contenders, contender => contender.creator);
                //     let matcherContender = find(contest.contenders, contender => !contender.creator);

                //     if (creatorContender && matcherContender) {
                //         let amount1 = +creatorContender.toRiskAmount - matcherContender.toWinAmount;
                //         let amount2 = +matcherContender.toRiskAmount - +creatorContender.toWinAmount;
                //         topPropRevenue = amount1 + amount2;
                //     }
                // }

                await contestRepository.updateById(ctx.instance.contestId, {
                    status: CONTEST_STATUSES.MATCHED,
                });
                console.log(
                    `Contests with id: ${ctx.instance.contestId} is matched and top prop revenue is calculated.`,
                );

                ctx.hookState.skipContestMatch = true;
            }
            return;
        });
        //* CREATE BET
        this.modelClass.observe('after save', async ctx => {
            if (ctx.instance && ctx.isNewInstance && !ctx.hookState.skipBetCreation) {
                const betRepository = await this.betRepositoryGetter();

                const bet = await betRepository.create({
                    contenderId: ctx.instance.id,
                    userId: ctx.instance.contenderId,
                    amount: ctx.instance.toRiskAmount,
                });

                console.log(
                    `Bet created for contest: ${ctx.instance.contestId} and for contender ${ctx.instance.contenderId}`,
                );

                ctx.hookState.skipBetCreation = true;
            }
            return;
        });
    }
}
