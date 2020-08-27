import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { Gain, GainRelations, User, Contender } from '../models';
import { DbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UserRepository } from './user.repository';
import { ContenderRepository } from './contender.repository';

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
    }
}
