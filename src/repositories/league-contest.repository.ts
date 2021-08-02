import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { LeagueContest, LeagueContestRelations, Team, User, League, ContestTeam } from '../models';
import { PlayerRepository } from './player.repository';
import { SpreadRepository } from './spread.repository';
import { TeamRepository } from './team.repository';
import { ContestTeamRepository } from './contest-team.repository';
import { UserRepository } from './user.repository';
import { LeagueRepository } from './league.repository';

export class LeagueContestRepository extends DefaultCrudRepository<
    LeagueContest,
    typeof LeagueContest.prototype.id,
    LeagueContestRelations
> {
    public readonly winner: BelongsToAccessor<User, typeof LeagueContest.prototype.id>;
    public readonly creator: BelongsToAccessor<User, typeof LeagueContest.prototype.id>;
    public readonly claimer: BelongsToAccessor<User, typeof LeagueContest.prototype.id>;
    public readonly creatorTeam: BelongsToAccessor<Team, typeof LeagueContest.prototype.id>;
    public readonly claimerTeam: BelongsToAccessor<Team, typeof LeagueContest.prototype.id>;
    public readonly creatorContestTeam: BelongsToAccessor<ContestTeam, typeof LeagueContest.prototype.id>;
    public readonly claimerContestTeam: BelongsToAccessor<ContestTeam, typeof LeagueContest.prototype.id>;
    public readonly league: BelongsToAccessor<League, typeof LeagueContest.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
        @repository.getter('ContestTeamRepository') protected contestTeamRepositoryGetter: Getter<ContestTeamRepository>,
        @repository.getter('SpreadRepository') protected spreadRepositoryGetter: Getter<SpreadRepository>,
        @repository.getter('LeagueRepository') protected leagueRepositoryGetter: Getter<LeagueRepository>,
    ) {
        super(LeagueContest, dataSource);

        this.winner = this.createBelongsToAccessorFor('winner', userRepositoryGetter);
        this.registerInclusionResolver('winner', this.winner.inclusionResolver);

        this.creator = this.createBelongsToAccessorFor('creator', userRepositoryGetter);
        this.registerInclusionResolver('creator', this.creator.inclusionResolver);

        this.claimer = this.createBelongsToAccessorFor('claimer', userRepositoryGetter);
        this.registerInclusionResolver('claimer', this.claimer.inclusionResolver);

        this.creatorTeam = this.createBelongsToAccessorFor('creatorTeam', teamRepositoryGetter);
        this.registerInclusionResolver('creatorTeam', this.creatorTeam.inclusionResolver);

        this.claimerTeam = this.createBelongsToAccessorFor('claimerTeam', teamRepositoryGetter);
        this.registerInclusionResolver('claimerTeam', this.claimerTeam.inclusionResolver);

        this.creatorContestTeam = this.createBelongsToAccessorFor('creatorContestTeam', contestTeamRepositoryGetter);
        this.registerInclusionResolver('creatorContestTeam', this.creatorContestTeam.inclusionResolver);

        this.claimerContestTeam = this.createBelongsToAccessorFor('claimerContestTeam', contestTeamRepositoryGetter);
        this.registerInclusionResolver('claimerContestTeam', this.claimerContestTeam.inclusionResolver);

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
