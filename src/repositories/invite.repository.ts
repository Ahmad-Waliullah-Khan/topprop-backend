import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Invite, InviteRelations, League, Member, Team } from '../models';
import { LeagueRepository } from './league.repository';
import { MemberRepository } from './member.repository';
import { TeamRepository } from './team.repository';

export class InviteRepository extends DefaultCrudRepository<Invite, typeof Invite.prototype.id, InviteRelations> {
    public readonly team: BelongsToAccessor<Team, typeof Invite.prototype.id>;
    public readonly league: BelongsToAccessor<League, typeof Invite.prototype.id>;
    public readonly member: BelongsToAccessor<Member, typeof Invite.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
        @repository.getter('LeagueRepository') protected leagueRepositoryGetter: Getter<LeagueRepository>,
        @repository.getter('MemberRepository') protected memberRepositoryGetter: Getter<MemberRepository>,
    ) {
        super(Invite, dataSource);

        this.team = this.createBelongsToAccessorFor('team', teamRepositoryGetter);
        this.registerInclusionResolver('team', this.team.inclusionResolver);

        this.league = this.createBelongsToAccessorFor('league', leagueRepositoryGetter);
        this.registerInclusionResolver('league', this.league.inclusionResolver);

        this.member = this.createBelongsToAccessorFor('member', memberRepositoryGetter);
        this.registerInclusionResolver('member', this.member.inclusionResolver);

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
