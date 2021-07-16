import {model, property} from '@loopback/repository';
import {Base} from '.';

@model()
export class ScoringType extends Base {
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
    name: string;

    constructor(data?: Partial<ScoringType>) {
        super(data);
    }
}

export interface ScoringTypeRelations {
    // describe navigational properties here

}

export type ScoringTypeWithRelations = ScoringType & ScoringTypeRelations;


