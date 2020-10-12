import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { WITHDRAW_REQUEST_STATUSES } from '@src/utils/constants';
import { WITHDRAW_REQUEST_MESSAGES } from '@src/utils/messages';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { User, WithdrawRequest, WithdrawRequestRelations } from '../models';
import { UserRepository } from './user.repository';

export class WithdrawRequestRepository extends DefaultCrudRepository<
    WithdrawRequest,
    typeof WithdrawRequest.prototype.id,
    WithdrawRequestRelations
> {
    public readonly user: BelongsToAccessor<User, typeof WithdrawRequest.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    ) {
        super(WithdrawRequest, dataSource);
        this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
        this.registerInclusionResolver('user', this.user.inclusionResolver);

        //*BEFORE SAVE
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });

        //*CHECK IF CURRENT USER HAS PENDING REQUESTS
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && ctx.isNewInstance && !ctx.hookState.skipLimitValidation) {
                const count = await this.count({
                    status: WITHDRAW_REQUEST_STATUSES.PENDING,
                    userId: ctx.instance.userId,
                });
                if (count.count) throw new HttpErrors.TooManyRequests(WITHDRAW_REQUEST_MESSAGES.LIMIT_EXCEEDED);

                ctx.hookState.skipLimitValidation = true;
            }
            return;
        });
    }
}
