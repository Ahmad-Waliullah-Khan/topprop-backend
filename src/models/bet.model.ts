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

    constructor(data?: Partial<Bet>) {
        super(data);
    }
}

export interface BetRelations {
    user?: User;
    contender?: Contender;
}

export type BetWithRelations = Bet & BetRelations;
