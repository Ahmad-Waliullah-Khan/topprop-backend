import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { DbDataSource } from '../datasources';
import { ContactSubmission, ContactSubmissionRelations, User } from '../models';
import { UserRepository } from './user.repository';

export class ContactSubmissionRepository extends DefaultCrudRepository<
    ContactSubmission,
    typeof ContactSubmission.prototype.id,
    ContactSubmissionRelations
> {
    public readonly user: BelongsToAccessor<User, typeof ContactSubmission.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    ) {
        super(ContactSubmission, dataSource);
        this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
        this.registerInclusionResolver('user', this.user.inclusionResolver);
    }
}
