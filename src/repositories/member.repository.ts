import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import moment from 'moment';
import {DbDataSource} from '../datasources';
import {League, Member, MemberRelations, User} from '../models';
import {LeagueRepository} from './league.repository';
import {UserRepository} from './user.repository';


export class MemberRepository extends DefaultCrudRepository<Member, typeof Member.prototype.id, MemberRelations> {
    public readonly user: BelongsToAccessor<User, typeof Member.prototype.id>;
    public readonly league: BelongsToAccessor<League, typeof Member.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('LeagueRepository') protected leagueRepositoryGetter: Getter<LeagueRepository>,
    ) {
        super(Member, dataSource);

        this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
        this.registerInclusionResolver('user', this.user.inclusionResolver);

        this.league = this.createBelongsToAccessorFor('league', leagueRepositoryGetter);
        this.registerInclusionResolver('league', this.league.inclusionResolver);

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
