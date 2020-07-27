import { model, property } from '@loopback/repository';
import { Base } from '.';

@model()
export class Team extends Base {
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
    league: string;

    @property({
        type: 'string',
        required: true,
    })
    slug: string;

    @property({
        type: 'string',
        required: true,
    })
    name: string;

    constructor(data?: Partial<Team>) {
        super(data);
    }
}

export interface TeamRelations {
    // describe navigational properties here
}

export type TeamWithRelations = Team & TeamRelations;
