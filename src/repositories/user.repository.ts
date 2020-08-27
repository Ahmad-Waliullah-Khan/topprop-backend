import { Getter, inject, service } from '@loopback/core';
import { DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
//* Added in this way to prevent circular dependency injection
import { StripeService } from '@src/services/stripe.service';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Bet, ContactSubmission, Contest, Gain, TopUp, User, UserRelations } from '../models';
import { BetRepository } from './bet.repository';
import { ContactSubmissionRepository } from './contact-submission.repository';
import { ContestRepository } from './contest.repository';
import { GainRepository } from './gain.repository';
import { TopUpRepository } from './top-up.repository';

export class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.id, UserRelations> {
    public readonly contactSubmissions: HasManyRepositoryFactory<ContactSubmission, typeof User.prototype.id>;

    public readonly topUps: HasManyRepositoryFactory<TopUp, typeof User.prototype.id>;

    public readonly contests: HasManyRepositoryFactory<Contest, typeof User.prototype.id>;

    public readonly bets: HasManyRepositoryFactory<Bet, typeof User.prototype.id>;

    public readonly gains: HasManyRepositoryFactory<Gain, typeof User.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @service() private stripeService: StripeService,
        // @inject.context() public ctx: Context,
        @repository.getter('ContactSubmissionRepository')
        protected contactSubmissionRepositoryGetter: Getter<ContactSubmissionRepository>,
        @repository.getter('TopUpRepository') protected topUpRepositoryGetter: Getter<TopUpRepository>,
        @repository.getter('ContestRepository') protected contestRepositoryGetter: Getter<ContestRepository>,
        @repository.getter('BetRepository') protected betRepositoryGetter: Getter<BetRepository>,
        @repository.getter('GainRepository') protected gainRepositoryGetter: Getter<GainRepository>,
    ) {
        super(User, dataSource);
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

        // await app.service(UserService).getValue(app);
        // this.ctx.get;
        // this.registerInclusionResolver('contactSubmissions', this.contactSubmissions.inclusionResolver);

        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
        /*
         * BEFORE DELETE
         */
        this.modelClass.observe('before delete', async ctx => {
            if (!ctx.hookState.skipMarkRemovableStripeCustomerAgain) {
                try {
                    let removableUser = await this.findById(ctx.where && ctx.where.id);
                    if (removableUser && removableUser._customerToken)
                        ctx.hookState.stripeCustomerToDelete = removableUser._customerToken;
                    if (removableUser && removableUser._connectToken)
                        ctx.hookState.stripeConnectToDelete = removableUser._connectToken;
                    ctx.hookState.removableUserId = removableUser.id;
                    ctx.hookState.userEmail = removableUser.email;
                } catch (error) {
                    console.error(`Could not find user to remove stripe customer account.`);
                }
                ctx.hookState.skipMarkRemovableStripeCustomerAgain = true;
            }
            return;
        });

        /*
         * AFTER DELETE
         */
        //* Delete Stripe customer account
        this.modelClass.observe('after delete', async ctx => {
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
        });

        //* Delete Stripe connect account
        this.modelClass.observe('after delete', async ctx => {
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
        });
    }
}
