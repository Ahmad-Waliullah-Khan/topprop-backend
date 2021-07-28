import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Player, Team, TeamRelations, User } from '../models';
import { GameRepository } from './game.repository';
import { PlayerRepository } from './player.repository';
import { UserRepository } from './user.repository';

export class TeamRepository extends DefaultCrudRepository<Team, typeof Team.prototype.id, TeamRelations> {
    public readonly players: HasManyRepositoryFactory<Player, typeof Team.prototype.id>;
    public readonly user: BelongsToAccessor<User, typeof Team.prototype.id>;
    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
        @repository.getter('GameRepository') protected gameRepositoryGetter: Getter<GameRepository>,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    ) {
        super(Team, dataSource);
        this.players = this.createHasManyRepositoryFactoryFor('players', playerRepositoryGetter);
        this.registerInclusionResolver('players', this.players.inclusionResolver);

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
