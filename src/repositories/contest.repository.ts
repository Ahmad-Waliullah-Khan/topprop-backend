import { Getter, inject } from '@loopback/core';
import moment from 'moment';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { DbDataSource } from '../datasources';
import { Contest, ContestRelations, Spread, User, Player } from '../models';

import { UserRepository } from './user.repository';
import { PlayerRepository } from './player.repository';
import { SpreadRepository } from './spread.repository';

export class ContestRepository extends DefaultCrudRepository<Contest, typeof Contest.prototype.id, ContestRelations> {
    public readonly winner: BelongsToAccessor<User, typeof Contest.prototype.id>;
    public readonly creator: BelongsToAccessor<User, typeof Contest.prototype.id>;
    public readonly claimer: BelongsToAccessor<User, typeof Contest.prototype.id>;
    public readonly creatorPlayer: BelongsToAccessor<Player, typeof Contest.prototype.id>;
    public readonly claimerPlayer: BelongsToAccessor<Player, typeof Contest.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
        @repository.getter('SpreadRepository') protected spreadRepositoryGetter: Getter<SpreadRepository>,
    ) {
        super(Contest, dataSource);
        
        this.winner = this.createBelongsToAccessorFor('winner', userRepositoryGetter);
        this.registerInclusionResolver('winner', this.winner.inclusionResolver);

        this.creator = this.createBelongsToAccessorFor('creator', userRepositoryGetter);
        this.registerInclusionResolver('creator', this.creator.inclusionResolver);

        this.claimer = this.createBelongsToAccessorFor('claimer', userRepositoryGetter);
        this.registerInclusionResolver('claimer', this.creator.inclusionResolver);

        this.creatorPlayer = this.createBelongsToAccessorFor('creatorPlayer', playerRepositoryGetter);
        this.registerInclusionResolver('creatorPlayer', this.creatorPlayer.inclusionResolver);

        this.claimerPlayer = this.createBelongsToAccessorFor('claimerPlayer', playerRepositoryGetter);
        this.registerInclusionResolver('claimerPlayer', this.claimerPlayer.inclusionResolver);

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
