import { belongsTo, model, property } from '@loopback/repository';
import { CONTEST_TYPES } from '@src/utils/constants';
import { Base } from '.';
import { Contest } from './contest.model';
import { User } from './user.model';

@model()
export class Contender extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'boolean',
        default: false,
        required: true,
    })
    winner: boolean;

    @property({
        type: 'date',
        required: false,
        default: null,
    })
    wonAt: Date | null;

    @property({
        type: 'boolean',
        default: false,
    })
    canceled: boolean;

    @property({
        type: 'string',
        default: null,
    })
    canceledReason: string | null;

    @property({
        type: 'date',
        required: false,
        default: null,
    })
    canceledAt: Date | null;

    @property({
        type: 'boolean',
        default: false,
    })
    tied: boolean;

    @property({
        type: 'string',
        default: null,
    })
    tiedReason: string | null;

    @property({
        type: 'date',
        required: false,
        default: null,
    })
    tiedAt: Date | null;

    @property({
        type: 'boolean',
        default: false,
        required: true,
    })
    creator: boolean;

    @property({
        type: 'string',
        required: true,
    })
    type: CONTEST_TYPES;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    toRiskAmount: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    toWinAmount: number;

    @belongsTo(() => Contest)
    contestId: number;

    @belongsTo(() => User)
    contenderId: number;

    constructor(data?: Partial<Contender>) {
        super(data);
    }
}

export interface ContenderRelations {
    // describe navigational properties here
    contest?: Contest;
    contender?: User;
}

export type ContenderWithRelations = Contender & ContenderRelations;
