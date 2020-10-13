import { belongsTo, model, property } from '@loopback/repository';
import { Base } from '.';
import { Contender } from './contender.model';
import { User } from './user.model';

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

    constructor(data?: Partial<Bet>) {
        super(data);
    }
}

export interface BetRelations {
    user?: User;
    contender?: Contender;
}

export type BetWithRelations = Bet & BetRelations;
