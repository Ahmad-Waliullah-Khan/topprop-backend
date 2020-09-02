import { DefaultCrudRepository } from '@loopback/repository';
import { ContestPayout, ContestPayoutRelations } from '../models';
import { DbDataSource } from '../datasources';
import { inject } from '@loopback/core';

export class ContestPayoutRepository extends DefaultCrudRepository<
    ContestPayout,
    typeof ContestPayout.prototype.id,
    ContestPayoutRelations
> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(ContestPayout, dataSource);
    }
}
