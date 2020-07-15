import { Getter, inject, service } from '@loopback/core';
import { DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
//* Added in this way to prevent circular dependency injection
import { StripeService } from '@src/services/stripe.service';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { ContactSubmission, User, UserRelations } from '../models';
import { ContactSubmissionRepository } from './contact-submission.repository';

export class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.id, UserRelations> {
    public readonly contactSubmissions: HasManyRepositoryFactory<ContactSubmission, typeof User.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @service() private stripeService: StripeService,
        // @inject.context() public ctx: Context,
        @repository.getter('ContactSubmissionRepository')
        protected contactSubmissionRepositoryGetter: Getter<ContactSubmissionRepository>,
    ) {
        super(User, dataSource);
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
        //* Delete Stripe account
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
    }
}
