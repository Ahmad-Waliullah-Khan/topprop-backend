import { model, property } from '@loopback/repository';
import { Base } from '.';

@model()
export class CouponCode extends Base {
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
    code: string;

    @property({
        type: 'number',
        required: true,
    })
    value: number;

    // Define well-known properties here

    // Indexer property to allow additional data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [prop: string]: any;

    constructor(data?: Partial<CouponCode>) {
        super(data);
    }
}

export interface CouponCodeRelations {
    // describe navigational properties here
}

export type CouponCodeWithRelations = CouponCode & CouponCodeRelations;
