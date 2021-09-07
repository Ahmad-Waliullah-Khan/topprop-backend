import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { PaymentGatewayEvent, PaymentGatewayEventRelations } from '../models';

export class PaymentGatewayEventRepository extends DefaultCrudRepository<
    PaymentGatewayEvent,
    typeof PaymentGatewayEvent.prototype.id,
    PaymentGatewayEventRelations
> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(PaymentGatewayEvent, dataSource);

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
