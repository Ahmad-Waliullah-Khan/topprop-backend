import { inject } from '@loopback/core';
import moment from 'moment';
import { DefaultCrudRepository } from '@loopback/repository';
import { DbDataSource } from '../datasources';
import { Contest, ContestRelations } from '../models';

export class ContestRepository extends DefaultCrudRepository<Contest, typeof Contest.prototype.id, ContestRelations> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(Contest, dataSource);

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
