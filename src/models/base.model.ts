import { Entity, model, property } from '@loopback/repository';

@model()
export class Base extends Entity {
    @property({
        type: 'date',
        default: () => new Date(),
    })
    createdAt?: string | Date;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    updatedAt?: string | Date;

    constructor(data?: Partial<Base>) {
        super(data);
    }
}

export interface BaseRelations {
    // describe navigational properties here
}

export type BaseWithRelations = Base & BaseRelations;
