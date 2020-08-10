import { belongsTo, model, property } from '@loopback/repository';
import { Base } from '.';
import { Team } from './team.model';

@model()
export class Player extends Base {
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

    @property({
        type: 'string',
        required: true,
    })
    position: string;

    @property({
        type: 'number',
        required: false,
    })
    bc2: number;

    @property({
        type: 'number',
        required: false,
    })
    bc3: number;

    @property({
        type: 'number',
        required: false,
    })
    bc4: number;

    @property({
        type: 'number',
        required: false,
    })
    bc5: number;

    @property({
        type: 'number',
        required: false,
    })
    bc6: number;

    @property({
        type: 'number',
        required: false,
    })
    bc7: number;

    @property({
        type: 'number',
        required: false,
    })
    bc8: number;

    @property({
        type: 'number',
        required: false,
    })
    bc9: number;

    @property({
        type: 'number',
        required: false,
    })
    bc10: number;

    @property({
        type: 'number',
        required: false,
    })
    bc11: number;

    @property({
        type: 'number',
        required: false,
    })
    bc12: number;

    @property({
        type: 'number',
        required: false,
    })
    bc13: number;

    @property({
        type: 'number',
        required: false,
    })
    bc14: number;

    @property({
        type: 'number',
        required: false,
    })
    bc15: number;

    @property({
        type: 'number',
        required: false,
    })
    bc16: number;

    @property({
        type: 'number',
        required: false,
    })
    bc17: number;

    @property({
        type: 'number',
        required: false,
    })
    bc18: number;

    @property({
        type: 'number',
        required: false,
    })
    bc19: number;

    @property({
        type: 'number',
        required: false,
    })
    bc20: number;

    @property({
        type: 'number',
        required: false,
    })
    bc21: number;

    @property({
        type: 'number',
        required: false,
    })
    bc22: number;

    @property({
        type: 'number',
        required: false,
    })
    bc23: number;

    @property({
        type: 'number',
        required: false,
    })
    bc24: number;

    @property({
        type: 'number',
        required: false,
    })
    bc25: number;

    @property({
        type: 'number',
        required: false,
    })
    bc26: number;

    @property({
        type: 'number',
        required: false,
    })
    bc27: number;

    @belongsTo(() => Team)
    teamId: number;

    constructor(data?: Partial<Player>) {
        super(data);
    }
}

export interface PlayerRelations {
    // describe navigational properties here
    team?: Team;
}

export type PlayerWithRelations = Player & PlayerRelations;
