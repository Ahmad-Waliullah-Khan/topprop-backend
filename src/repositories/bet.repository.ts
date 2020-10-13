import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Bet, BetRelations, Contender, User } from '../models';
import { ContenderRepository } from './contender.repository';
import { UserRepository } from './user.repository';

export class BetRepository extends DefaultCrudRepository<Bet, typeof Bet.prototype.id, BetRelations> {
    public readonly user: BelongsToAccessor<User, typeof Bet.prototype.id>;

    public readonly contender: BelongsToAccessor<Contender, typeof Bet.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('ContenderRepository') protected contenderRepositoryGetter: Getter<ContenderRepository>,
    ) {
        super(Bet, dataSource);
        this.contender = this.createBelongsToAccessorFor('contender', contenderRepositoryGetter);
        this.registerInclusionResolver('contender', this.contender.inclusionResolver);
        this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
        this.registerInclusionResolver('user', this.user.inclusionResolver);

        //* BEFORE SAVE HOOK
        //* ASSIGN UPDATED AT
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
    }
}
