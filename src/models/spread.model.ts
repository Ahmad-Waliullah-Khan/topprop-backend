import { model, property } from '@loopback/repository';
import { Base } from '.';

@model()
export class Spread extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
        description: 'Table hold spread and money line info for the project',
    })
    id: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    projection_spread: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    spread: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    spread_pay: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    ml: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    ml_pay: number;

    @property({
        type: 'string',
        required: true,
    })
    spread_type: string;

    // Define well-known properties here

    // Indexer property to allow additional data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [prop: string]: any;

    constructor(data?: Partial<Spread>) {
        super(data);
    }
}

export interface SpreadRelations {
    // describe navigational properties here
}

export type SpreadWithRelations = Spread & SpreadRelations;
