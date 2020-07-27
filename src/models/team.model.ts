import { hasMany, model, property } from '@loopback/repository';
import { Base } from '.';
import { Player } from './player.model';

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
    abbr: string;

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

    @hasMany(() => Player)
    players: Player[];

    constructor(data?: Partial<Team>) {
        super(data);
    }
}

export interface TeamRelations {
    // describe navigational properties here
    players?: Player[];
}

export type TeamWithRelations = Team & TeamRelations;
