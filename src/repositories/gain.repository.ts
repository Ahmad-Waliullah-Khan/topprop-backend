import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Contender, Gain, GainRelations, User } from '../models';
import { ContenderRepository } from './contender.repository';
import { UserRepository } from './user.repository';

export class GainRepository extends DefaultCrudRepository<Gain, typeof Gain.prototype.id, GainRelations> {
    public readonly user: BelongsToAccessor<User, typeof Gain.prototype.id>;

    public readonly contender: BelongsToAccessor<Contender, typeof Gain.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('ContenderRepository') protected contenderRepositoryGetter: Getter<ContenderRepository>,
    ) {
        super(Gain, dataSource);
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
