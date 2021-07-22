import { Getter, inject } from '@loopback/core';
import {
    BelongsToAccessor,
    DefaultTransactionalRepository,
    repository,
    HasManyRepositoryFactory,
} from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { League, LeagueRelations, User, Team, Member, ScoringType } from '../models';
import { UserRepository } from './user.repository';
import { TeamRepository } from './team.repository';
import { MemberRepository } from './member.repository';
import { ScoringTypeRepository } from './scoring-type.repository';

export class LeagueRepository extends DefaultTransactionalRepository<
    League,
    typeof League.prototype.id,
    LeagueRelations
> {
    public readonly user: BelongsToAccessor<User, typeof League.prototype.id>;
    public readonly teams: HasManyRepositoryFactory<Team, typeof League.prototype.id>;
    public readonly members: HasManyRepositoryFactory<Member, typeof League.prototype.id>;
    public readonly scoringType: BelongsToAccessor<ScoringType, typeof League.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
        @repository.getter('MemberRepository') protected memberRepositoryGetter: Getter<MemberRepository>,
        @repository.getter('ScoringTypeRepository') protected scoringTypeRepositoryGetter: Getter<ScoringTypeRepository>,
    ) {
        super(League, dataSource);

        this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
        this.registerInclusionResolver('user', this.user.inclusionResolver);

        this.teams = this.createHasManyRepositoryFactoryFor('teams', teamRepositoryGetter);
        this.registerInclusionResolver('teams', this.teams.inclusionResolver);

        this.members = this.createHasManyRepositoryFactoryFor('members', memberRepositoryGetter);
        this.registerInclusionResolver('members', this.members.inclusionResolver);

        this.scoringType = this.createBelongsToAccessorFor('scoringType', scoringTypeRepositoryGetter);
        this.registerInclusionResolver('scoringType', this.scoringType.inclusionResolver);

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
