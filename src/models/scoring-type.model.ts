import {hasMany, model, property} from '@loopback/repository';
import {Base} from '.';
import {League} from './league.model';

@model()
export class ScoringType extends Base {
    @property({
        type: 'number',
        id: true,
    })
    id: number;

    @property({
        type: 'string',
        required: true,
    })
    name: string;

    @hasMany(() => League)
    leagues: League[];

    constructor(data?: Partial<ScoringType>) {
        super(data);
    }
}

export interface ScoringTypeRelations {
    // describe navigational properties here
    leagues?: League[];
}

export type ScoringTypeWithRelations = ScoringType & ScoringTypeRelations;
