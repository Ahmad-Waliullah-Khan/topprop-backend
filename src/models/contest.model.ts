import { Entity, model, property } from '@loopback/repository';

@model()
export class Contest extends Entity {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    createdAt?: string;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    updatedAt?: string;

    constructor(data?: Partial<Contest>) {
        super(data);
    }
}

export interface ContestRelations {
    // describe navigational properties here
}

export type ContestWithRelations = Contest & ContestRelations;
