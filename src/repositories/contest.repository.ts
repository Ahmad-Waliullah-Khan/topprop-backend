import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Contest, ContestRelations } from '../models';

export class ContestRepository extends DefaultCrudRepository<Contest, typeof Contest.prototype.id, ContestRelations> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(Contest, dataSource);

        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
    }
}
