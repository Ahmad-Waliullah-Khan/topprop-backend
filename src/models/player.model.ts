import {belongsTo, hasMany, model, property} from '@loopback/repository';
import {Base} from '.';
import {PlayerResult} from './player-result.model';
import {Team} from './team.model';

@model()
export class Player extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
        required: false,
    })
    remoteId: number;

    @property({
        type: 'string',
        required: true,
    })
    firstName: string;

    @property({
        type: 'string',
        required: true,
    })
    lastName: string;

    @property({
        type: 'string',
        required: true,
    })
    fullName: string;

    @property({
        type: 'string',
        required: true,
    })
    shortName: string;

    @property({
        type: 'string',
        required: true,
    })
    status: string;

    @property({
        type: 'string',
        required: false,
    })
    photoUrl: string;

    @property({
        type: 'string',
        required: false,
    })
    photoUrlHiRes: string;

    @property({
        type: 'boolean',
        default: true,
    })
    available: boolean;

    @property({
        type: 'string',
        required: false,
    })
    position: string;

    @property({
        type: 'string',
        required: false,
    })
    teamName: string;

    @property({
        type: 'string',
        required: false,
    })
    opponentName: string;

    @property({
        type: 'string',
        required: false,
    })
    homeOrAway: string;

    @property({
        type: 'boolean',
        default: false,
    })
    hasStarted: boolean;

    @property({
        type: 'boolean',
        default: false,
    })
    isOver: boolean;

    @property({
        type: 'number',
        required: true,
        default: 0,
        postgresql: {
            dataType: 'decimal',
        },
    })
    fantasyPoints: number;

    @property({
        type: 'number',
        required: false,
        default: 0,
        postgresql: {
            dataType: 'decimal',
        },
    })
    fantasyPointsHalfPpr: number;

    @property({
        type: 'number',
        required: false,
        default: 0,
        postgresql: {
            dataType: 'decimal',
        },
    })
    fantasyPointsFullPpr: number;

    @property({
        type: 'number',
        required: true,
        default: 0,
        postgresql: {
            dataType: 'decimal',
        },
    })
    projectedFantasyPoints: number;

    @property({
        type: 'number',
        required: false,
        default: 0,
        postgresql: {
            dataType: 'decimal',
        },
    })
    projectedFantasyPointsHalfPpr: number;

    @property({
        type: 'number',
        required: false,
        default: 1,
    })
    playerType: number;

    @property({
        type: 'string',
        required: false,
    })
    lastUpdateFrom: string;

    @belongsTo(() => Team)
    teamId: number;

    @hasMany(() => PlayerResult)
    playerResults: PlayerResult[];

    @property({
        type: 'number',
        required: false,
    })
    yahooPlayerId: number;

    @property({
        type: 'number',
        required: false,
    })
    espnPlayerId: number;

    constructor(data?: Partial<Player>) {
        super(data);
    }
}

export interface PlayerRelations {
    // describe navigational properties here
    team?: Team;
}

export type PlayerWithRelations = Player & PlayerRelations;
