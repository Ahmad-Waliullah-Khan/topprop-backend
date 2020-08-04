import { Getter, inject } from '@loopback/core';
import { DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Player, Team, TeamRelations } from '../models';
import { GameRepository } from './game.repository';
import { PlayerRepository } from './player.repository';

export class TeamRepository extends DefaultCrudRepository<Team, typeof Team.prototype.id, TeamRelations> {
    public readonly players: HasManyRepositoryFactory<Player, typeof Team.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
        @repository.getter('GameRepository') protected gameRepositoryGetter: Getter<GameRepository>,
    ) {
        super(Team, dataSource);
        this.players = this.createHasManyRepositoryFactoryFor('players', playerRepositoryGetter);
        this.registerInclusionResolver('players', this.players.inclusionResolver);

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
