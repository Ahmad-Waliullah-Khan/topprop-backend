import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import moment from 'moment';
import {DbDataSource} from '../datasources';
import {ContestRoster, ContestRosterRelations, Player, Team} from '../models';
import {PlayerRepository} from './player.repository';
import {TeamRepository} from './team.repository';


export class ContestRosterRepository extends DefaultCrudRepository<ContestRoster, typeof ContestRoster.prototype.id, ContestRosterRelations> {
    public readonly player: BelongsToAccessor<Player, typeof ContestRoster.prototype.id>;
    public readonly team: BelongsToAccessor<Team, typeof ContestRoster.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
    ) {
        super(ContestRoster, dataSource);

        this.player = this.createBelongsToAccessorFor('player', playerRepositoryGetter);
        this.registerInclusionResolver('player', this.player.inclusionResolver);

        this.team = this.createBelongsToAccessorFor('team', teamRepositoryGetter);
        this.registerInclusionResolver('team', this.team.inclusionResolver);

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
