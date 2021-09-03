import { Getter, inject, service } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { TopUp, TopUpRelations, User } from '../models';
import { UserService } from '../services/user.service';
import { UserRepository } from './user.repository';

export class TopUpRepository extends DefaultCrudRepository<TopUp, typeof TopUp.prototype.id, TopUpRelations> {
    public readonly user: BelongsToAccessor<User, typeof TopUp.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @service() private userService: UserService,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    ) {
        super(TopUp, dataSource);
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
    }
}
