import { Getter, inject } from '@loopback/core';
import { DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { ContactSubmission, User, UserRelations } from '../models';
import { ContactSubmissionRepository } from './contact-submission.repository';

export class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.id, UserRelations> {
    public readonly contactSubmissions: HasManyRepositoryFactory<ContactSubmission, typeof User.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('ContactSubmissionRepository')
        protected contactSubmissionRepositoryGetter: Getter<ContactSubmissionRepository>,
    ) {
        super(User, dataSource);
        this.contactSubmissions = this.createHasManyRepositoryFactoryFor(
            'contactSubmissions',
            contactSubmissionRepositoryGetter,
        );
        this.registerInclusionResolver('contactSubmissions', this.contactSubmissions.inclusionResolver);

        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
        // this.modelClass.observe('after save', async ctx => {
        //     if (ctx.isNewInstance && !ctx.hookState.skipSendWelcome) {
        //         console.log(ctx.instance.email);
        //         ctx.hookState.skipSendWelcome = true;
        //     }
        //     return;
        // });
    }
}
