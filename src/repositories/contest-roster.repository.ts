import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import moment from 'moment';
import {DbDataSource} from '../datasources';
import {ContestRoster, ContestRosterRelations, Player, ContestTeam} from '../models';
import {PlayerRepository} from './player.repository';
import {ContestTeamRepository} from './contest-team.repository';


export class ContestRosterRepository extends DefaultCrudRepository<ContestRoster, typeof ContestRoster.prototype.id, ContestRosterRelations> {
    public readonly player: BelongsToAccessor<Player, typeof ContestRoster.prototype.id>;
    public readonly contestTeam: BelongsToAccessor<ContestTeam, typeof ContestRoster.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
        @repository.getter('ContestTeamRepository') protected contestTeamRepositoryGetter: Getter<ContestTeamRepository>,
    ) {
        super(ContestRoster, dataSource);

        this.player = this.createBelongsToAccessorFor('player', playerRepositoryGetter);
        this.registerInclusionResolver('player', this.player.inclusionResolver);

        this.contestTeam = this.createBelongsToAccessorFor('contestTeam', contestTeamRepositoryGetter);
        this.registerInclusionResolver('contestTeam', this.contestTeam.inclusionResolver);

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
