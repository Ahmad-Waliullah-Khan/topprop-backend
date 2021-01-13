import { model, property } from '@loopback/repository';
import { Base } from '.';

@model()
export class ContestPayout extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
        required: true,
    })
    percentLikelihood: number;

    @property({
        type: 'number',
        required: true,
    })
    odds: number;

    @property({
        type: 'number',
        required: true,
    })
    matchOdds: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    betPayout: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    matchBetPayout: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    matchPayout: number;

    constructor(data?: Partial<ContestPayout>) {
        super(data);
    }
}

export interface ContestPayoutRelations {
    // describe navigational properties here
}

export type ContestPayoutWithRelations = ContestPayout & ContestPayoutRelations;
