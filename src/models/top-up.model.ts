import { belongsTo, model, property } from '@loopback/repository';
import { WithdrawRequest } from './withdraw-request.model';
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
        required: false,
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
    withdrawTransferUrl: string | null;

    @property({
        type: 'date',
        default: () => null,
    })
    transferredAt?: Date | null;

    @property({
        type: 'boolean',
        default: false,
    })
    paid: boolean;

    @property({
        type: 'string',
        default: null,
    })
    payoutId: string | null;

    @property({
        type: 'date',
        default: () => null,
    })
    paidAt?: Date | null;

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
        required: false,
        type: 'string',
        default: null,
    })
    topUpTransferUrl: string | null;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    grossAmount: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    netAmount: number;

    @belongsTo(() => User)
    userId: number;

    @belongsTo(() => WithdrawRequest)
    withdrawRequestId: number;

    constructor(data?: Partial<TopUp>) {
        super(data);
    }
}

export interface TopUpRelations {
    // describe navigational properties here
    user?: User;
    withdrawRequest?: WithdrawRequest;
}

export type TopUpWithRelations = TopUp & TopUpRelations;
