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
