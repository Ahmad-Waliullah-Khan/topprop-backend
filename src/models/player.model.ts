import { belongsTo, model, property, hasMany } from '@loopback/repository';
import { Base } from '.';
import { Team } from './team.model';
import { PlayerResult } from './player-result.model';

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
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc2: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc3: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc4: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc5: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc6: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc7: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc8: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc9: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc10: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc11: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc12: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc13: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc14: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc15: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc16: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc17: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc18: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc19: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc20: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc21: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc22: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc23: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc24: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc25: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc26: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    bc27: number;

    @belongsTo(() => Team)
    teamId: number;

    @hasMany(() => PlayerResult)
    playerResults: PlayerResult[];

    constructor(data?: Partial<Player>) {
        super(data);
    }
}

export interface PlayerRelations {
    // describe navigational properties here
    team?: Team;
}

export type PlayerWithRelations = Player & PlayerRelations;
