import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {Bet, BetRelations, User, Contender} from '../models';
import {DbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {UserRepository} from './user.repository';
import {ContenderRepository} from './contender.repository';

export class BetRepository extends DefaultCrudRepository<
  Bet,
  typeof Bet.prototype.id,
  BetRelations
> {

  public readonly user: BelongsToAccessor<User, typeof Bet.prototype.id>;

  public readonly contender: BelongsToAccessor<Contender, typeof Bet.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource, @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>, @repository.getter('ContenderRepository') protected contenderRepositoryGetter: Getter<ContenderRepository>,
  ) {
    super(Bet, dataSource);
    this.contender = this.createBelongsToAccessorFor('contender', contenderRepositoryGetter,);
    this.registerInclusionResolver('contender', this.contender.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
