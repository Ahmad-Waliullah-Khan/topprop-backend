import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository, HasManyRepositoryFactory } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { ContestTeam, ContestTeamRelations, Team, ContestRoster } from '../models';
import { TeamRepository } from './team.repository';
import { ContestRosterRepository } from './contest-roster.repository';

export class ContestTeamRepository extends DefaultCrudRepository<
    ContestTeam,
    typeof ContestTeam.prototype.id,
    ContestTeamRelations
> {
    public readonly team: BelongsToAccessor<Team, typeof ContestTeam.prototype.id>;
    public readonly contestRosters: HasManyRepositoryFactory<ContestRoster, typeof ContestTeam.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
        @repository.getter('ContestRosterRepository') protected contestRosterRepositoryGetter: Getter<ContestRosterRepository>,
    ) {
        super(ContestTeam, dataSource);

        this.team = this.createBelongsToAccessorFor('team', teamRepositoryGetter);
        this.registerInclusionResolver('team', this.team.inclusionResolver);

        this.contestRosters = this.createHasManyRepositoryFactoryFor('contestRosters', contestRosterRepositoryGetter);
        this.registerInclusionResolver('contestRosters', this.contestRosters.inclusionResolver)

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
