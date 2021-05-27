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
    projectionSpread: number;

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
    spreadPay: number;

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
    mlPay: number;

    @property({
        type: 'string',
        required: true,
    })
    spreadType: string;

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
