import { belongsTo, model, property } from '@loopback/repository';
import { BONUSSTATUS } from '@src/utils/constants';
import { Base } from '.';
import { User, UserWithRelations } from './user.model';

@model()
export class BonusPayout extends Base {
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
    amount: number;

    @property({
        type: 'string',
        required: true,
    })
    message: string;

    @property({
        type: 'number',
        required: true,
        default: BONUSSTATUS.PENDING,
    })
    status: number;

    @belongsTo(() => User)
    userId: number;

    // Define well-known properties here

    // Indexer property to allow additional data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [prop: string]: any;

    constructor(data?: Partial<BonusPayout>) {
        super(data);
    }
}

export interface BonusPayoutRelations {
    // describe navigational properties here
    user?: UserWithRelations;
}

export type BonusPayoutWithRelations = BonusPayout & BonusPayoutRelations;
