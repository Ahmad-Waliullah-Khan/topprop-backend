import { belongsTo, model, property } from '@loopback/repository';
import { Base } from './base.model';
import { User } from './user.model';

@model()
export class TopUp extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'string',
        required: true,
    })
    paymentIntentId: string;

    @property({
        type: 'boolean',
        default: false,
    })
    transferred: boolean;

    @property({
        type: 'string',
        default: null,
    })
    transferId: string | null;

    @property({
        type: 'boolean',
        default: false,
    })
    paidOut: boolean;

    @property({
        type: 'string',
        default: null,
    })
    payOutId: string | null;

    @property({
        type: 'boolean',
        default: false,
    })
    refunded: boolean;

    @property({
        type: 'string',
        default: null,
    })
    refundId: string | null;

    @property({
        type: 'number',
        required: true,
    })
    grossAmount: number;

    @property({
        type: 'number',
        required: true,
    })
    netAmount: number;

    @belongsTo(() => User)
    userId: number;

    constructor(data?: Partial<TopUp>) {
        super(data);
    }
}

export interface TopUpRelations {
    // describe navigational properties here
    user?: User;
}

export type TopUpWithRelations = TopUp & TopUpRelations;
