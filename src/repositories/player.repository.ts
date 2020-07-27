import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Player, PlayerRelations, Team } from '../models';
import { TeamRepository } from './team.repository';

export class PlayerRepository extends DefaultCrudRepository<Player, typeof Player.prototype.id, PlayerRelations> {
    public readonly team: BelongsToAccessor<Team, typeof Player.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
    ) {
        super(Player, dataSource);
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
