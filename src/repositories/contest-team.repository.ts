import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import moment from 'moment';
import {DbDataSource} from '../datasources';
import {ContestTeam, ContestTeamRelations, Team} from '../models';
import {TeamRepository} from './team.repository';


export class ContestTeamRepository extends DefaultCrudRepository<ContestTeam, typeof ContestTeam.prototype.id, ContestTeamRelations> {
    public readonly team: BelongsToAccessor<Team, typeof ContestTeam.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
    ) {
        super(ContestTeam, dataSource);

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
