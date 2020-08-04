import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { DbDataSource } from '../datasources';
import { Game, GameRelations, Team } from '../models';
import { TeamRepository } from './team.repository';

export class GameRepository extends DefaultCrudRepository<Game, typeof Game.prototype.id, GameRelations> {
    public readonly homeTeam: BelongsToAccessor<Team, typeof Game.prototype.id>;
    public readonly visitorTeam: BelongsToAccessor<Team, typeof Game.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
    ) {
        super(Game, dataSource);
        this.visitorTeam = this.createBelongsToAccessorFor('visitorTeam', teamRepositoryGetter);
        this.registerInclusionResolver('visitorTeam', this.visitorTeam.inclusionResolver);
        this.homeTeam = this.createBelongsToAccessorFor('homeTeam', teamRepositoryGetter);
        this.registerInclusionResolver('homeTeam', this.homeTeam.inclusionResolver);
    }
}
