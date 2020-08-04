import { model, property } from '@loopback/repository';
import { Base } from './base.model';

@model()
export class Contest extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    constructor(data?: Partial<Contest>) {
        super(data);
    }
}

export interface ContestRelations {
    // describe navigational properties here
}

export type ContestWithRelations = Contest & ContestRelations;
