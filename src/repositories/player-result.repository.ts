import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { PlayerResult, PlayerResultRelations, Player } from '../models';
import { DbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { PlayerRepository } from './player.repository';

export class PlayerResultRepository extends DefaultCrudRepository<
    PlayerResult,
    typeof PlayerResult.prototype.id,
    PlayerResultRelations
> {
    public readonly player: BelongsToAccessor<Player, typeof PlayerResult.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
    ) {
        super(PlayerResult, dataSource);
        this.player = this.createBelongsToAccessorFor('player', playerRepositoryGetter);
        this.registerInclusionResolver('player', this.player.inclusionResolver);
    }
}
