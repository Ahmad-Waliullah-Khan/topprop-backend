import { Getter, inject } from '@loopback/core';
import { DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
//* Added in this way to prevent circular dependency injection
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Bet, ContactSubmission, Contest, Gain, Team, TopUp, User, UserRelations, WithdrawRequest } from '../models';
import { BetRepository } from './bet.repository';
import { ContactSubmissionRepository } from './contact-submission.repository';
import { ContestRepository } from './contest.repository';
import { GainRepository } from './gain.repository';
import { TeamRepository } from './team.repository';
import { TopUpRepository } from './top-up.repository';
import { WithdrawRequestRepository } from './withdraw-request.repository';

export class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.id, UserRelations> {
    public readonly contactSubmissions: HasManyRepositoryFactory<ContactSubmission, typeof User.prototype.id>;

    public readonly topUps: HasManyRepositoryFactory<TopUp, typeof User.prototype.id>;

    public readonly contests: HasManyRepositoryFactory<Contest, typeof User.prototype.id>;

    public readonly bets: HasManyRepositoryFactory<Bet, typeof User.prototype.id>;

    public readonly gains: HasManyRepositoryFactory<Gain, typeof User.prototype.id>;

    public readonly withdrawRequests: HasManyRepositoryFactory<WithdrawRequest, typeof User.prototype.id>;

    public readonly teams: HasManyRepositoryFactory<Team, typeof User.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('ContactSubmissionRepository')
        protected contactSubmissionRepositoryGetter: Getter<ContactSubmissionRepository>,
        @repository.getter('TopUpRepository') protected topUpRepositoryGetter: Getter<TopUpRepository>,
        @repository.getter('ContestRepository') protected contestRepositoryGetter: Getter<ContestRepository>,
        @repository.getter('BetRepository') protected betRepositoryGetter: Getter<BetRepository>,
        @repository.getter('GainRepository') protected gainRepositoryGetter: Getter<GainRepository>,
        @repository.getter('TeamRepository') protected teamRepositoryGetter: Getter<TeamRepository>,
        @repository.getter('WithdrawRequestRepository')
        protected withdrawRequestRepositoryGetter: Getter<WithdrawRequestRepository>,
    ) {
        super(User, dataSource);
        this.withdrawRequests = this.createHasManyRepositoryFactoryFor(
            'withdrawRequests',
            withdrawRequestRepositoryGetter,
        );
        this.registerInclusionResolver('withdrawRequests', this.withdrawRequests.inclusionResolver);
        this.gains = this.createHasManyRepositoryFactoryFor('gains', gainRepositoryGetter);
        this.registerInclusionResolver('gains', this.gains.inclusionResolver);
        this.bets = this.createHasManyRepositoryFactoryFor('bets', betRepositoryGetter);
        this.registerInclusionResolver('bets', this.bets.inclusionResolver);
        this.contests = this.createHasManyRepositoryFactoryFor('contests', contestRepositoryGetter);
        this.registerInclusionResolver('contests', this.contests.inclusionResolver);
        this.topUps = this.createHasManyRepositoryFactoryFor('topUps', topUpRepositoryGetter);
        this.registerInclusionResolver('topUps', this.topUps.inclusionResolver);
        this.contactSubmissions = this.createHasManyRepositoryFactoryFor(
            'contactSubmissions',
            contactSubmissionRepositoryGetter,
        );
        this.teams = this.createHasManyRepositoryFactoryFor('teams', teamRepositoryGetter);

        // await app.service(UserService).getValue(app);
        // this.ctx.get;
        // this.registerInclusionResolver('contactSubmissions', this.contactSubmissions.inclusionResolver);

        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                if (ctx.instance.dateOfBirth)
                    ctx.instance.dateOfBirth = moment(ctx.instance.dateOfBirth).startOf('day').toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
        /*
         * BEFORE DELETE
         */
        // this.modelClass.observe('before delete', async ctx => {
        //     if (!ctx.hookState.skipMarkRemovableStripeCustomerAgain) {
        //         try {
        //             const removableUser = await this.findById(ctx.where && ctx.where.id);
        //             if (removableUser && removableUser._customerTokenUrl)
        //                 ctx.hookState.stripeCustomerToDelete = removableUser._customerTokenUrl;
        //             if (removableUser && removableUser._connectToken)
        //                 ctx.hookState.stripeConnectToDelete = removableUser._connectToken;
        //             ctx.hookState.removableUserId = removableUser.id;
        //             ctx.hookState.userEmail = removableUser.email;
        //         } catch (error) {
        //             console.error(`Could not find user to remove stripe customer account.`);
        //         }
        //         ctx.hookState.skipMarkRemovableStripeCustomerAgain = true;
        //     }
        //     return;
        // });

        /*
         * AFTER DELETE
         */
        //* Delete Stripe customer account
        /* this.modelClass.observe('after delete', async ctx => {
            if (!ctx.hookState.notRemoveStripeCustomerAgain && ctx.hookState.stripeCustomerToDelete) {
                try {
                    await this.stripeService.stripe.customers.del(ctx.hookState.stripeCustomerToDelete);
                    console.log(`Stripe customer removed for user ${ctx.hookState.userEmail}`);
                } catch (error) {
                    console.error(`Could not delete stripe customer for user ${ctx.hookState.userEmail}`);
                }
                ctx.hookState.notRemoveStripeCustomerAgain = true;
            }
            return;
        }); */

        //* Delete Stripe connect account
        /* this.modelClass.observe('after delete', async ctx => {
            if (!ctx.hookState.notRemoveStripeConnectAgain && ctx.hookState.stripeConnectToDelete) {
                try {
                    await this.stripeService.stripe.accounts.del(ctx.hookState.stripeConnectToDelete);
                    console.log(`Stripe connect removed for user ${ctx.hookState.userEmail}`);
                } catch (error) {
                    console.error(`Could not delete stripe connect for user ${ctx.hookState.userEmail}`);
                }
                ctx.hookState.notRemoveStripeConnectAgain = true;
            }
            return;
        }); */
    }
}
