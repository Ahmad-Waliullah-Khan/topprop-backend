import { belongsTo, model, property } from '@loopback/repository';
import { Base } from '.';
import { Contender } from './contender.model';
import { WithdrawRequest } from './withdraw-request.model';
import { User } from './user.model';
import { Contest } from './contest.model';

@model()
export class Bet extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    amount: number;

    @belongsTo(() => User)
    userId: number;

    @belongsTo(() => Contender)
    contenderId: number;

    @belongsTo(() => Contest)
    contestId: number;

    @property({
        type: 'string',
        default: 'battleground',
    })
    contestType: string;

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

    @belongsTo(() => WithdrawRequest)
    withdrawRequestId: number;

    constructor(data?: Partial<Bet>) {
        super(data);
    }
}

export interface BetRelations {
    user?: User;
    contender?: Contender;
    contest?: Contest;
}

export type BetWithRelations = Bet & BetRelations;
