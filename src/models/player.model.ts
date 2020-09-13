import { belongsTo, hasMany, model, property } from '@loopback/repository';
import { Base } from '.';
import { PlayerResult } from './player-result.model';
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
        type: 'boolean',
        default: true,
    })
    available: boolean;

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
    points0: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points2: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points4: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points6: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points8: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points10: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points12: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points14: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points16: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points18: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points20: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points22: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points24: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points26: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points28: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points30: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points32: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points34: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points36: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points38: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points40: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points42: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points44: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points46: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points48: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    points50: number;

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
