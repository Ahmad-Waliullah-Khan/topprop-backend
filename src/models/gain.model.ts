import { belongsTo, model, property } from '@loopback/repository';
import { Base } from '.';
import { Contender } from './contender.model';
import { User } from './user.model';

@model()
export class Gain extends Base {
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

    constructor(data?: Partial<Gain>) {
        super(data);
    }
}

export interface GainRelations {
    // describe navigational properties here
}

export type GainWithRelations = Gain & GainRelations;
