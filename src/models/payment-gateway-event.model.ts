import { model, property } from '@loopback/repository';
import { Base } from '.';

@model()
export class PaymentGatewayEvent extends Base {
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
    eventId: string;

    @property({
        type: 'string',
        required: true,
    })
    eventUrl: string;

    @property({
        type: 'string',
        required: true,
    })
    topic: string;

    constructor(data?: Partial<PaymentGatewayEvent>) {
        super(data);
    }
}

export interface PaymentGatewayEventRelations {
    // describe navigational properties here
}

export type PaymentGatewayEventWithRelations = PaymentGatewayEvent & PaymentGatewayEventRelations;
