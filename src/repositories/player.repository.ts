import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository, HasManyRepositoryFactory } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Player, PlayerRelations, Team, PlayerResult } from '../models';
import { TeamRepository } from './team.repository';
import { PlayerResultRepository } from './player-result.repository';

export class PlayerRepository extends DefaultCrudRepository<Player, typeof Player.prototype.id, PlayerRelations> {
    public readonly team: BelongsToAccessor<Team, typeof Player.prototype.id>;

    public readonly playerResults: HasManyRepositoryFactory<PlayerResult, typeof Player.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
        @repository.getter('PlayerResultRepository')
        protected playerResultRepositoryGetter: Getter<PlayerResultRepository>,
    ) {
        super(Player, dataSource);
        this.playerResults = this.createHasManyRepositoryFactoryFor('playerResults', playerResultRepositoryGetter);
        this.registerInclusionResolver('playerResults', this.playerResults.inclusionResolver);
        this.team = this.createBelongsToAccessorFor('team', teamRepositoryGetter);
        this.registerInclusionResolver('team', this.team.inclusionResolver);

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
