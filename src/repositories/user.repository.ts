import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { DbDataSource } from '../datasources';
import { User, UserRelations } from '../models';

export class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.id, UserRelations> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(User, dataSource);

        // this.modelClass.observe('before save', async ctx => {
        //     console.log(ctx);
        // });
        // this.modelClass.observe('after save', async ctx => {
        //     if (ctx.isNewInstance && !ctx.hookState.skipSendWelcome) {
        //         console.log(ctx.instance.email);
        //         ctx.hookState.skipSendWelcome = true;
        //     }
        //     return;
        // });
    }
}
