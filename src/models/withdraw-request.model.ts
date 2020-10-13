import { belongsTo, model, property } from '@loopback/repository';
import { WITHDRAW_REQUEST_STATUSES } from '@src/utils/constants';
import { Base } from '.';
import { User } from './user.model';

@model()
export class WithdrawRequest extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'string',
        required: true,
        default: WITHDRAW_REQUEST_STATUSES.PENDING,
    })
    status: string;

    @property({
        type: 'date',
        default: null,
    })
    acceptedAt?: Date | null;

    @property({
        type: 'date',
        default: null,
    })
    deniedAt?: Date | null;

    @property({
        type: 'string',
    })
    deniedReason?: String;

    @property({
        type: 'number',
        required: true,
    })
    netAmount: number;

    @property({
        type: 'number',
        required: true,
    })
    brutAmount: number;

    @property({
        type: 'string',
        default: null,
    })
    payoutId: string | null;

    @belongsTo(() => User)
    userId: number;

    constructor(data?: Partial<WithdrawRequest>) {
        super(data);
    }
}

export interface WithdrawRequestRelations {
    // describe navigational properties here
    user?: User;
}

export type WithdrawRequestWithRelations = WithdrawRequest & WithdrawRequestRelations;
