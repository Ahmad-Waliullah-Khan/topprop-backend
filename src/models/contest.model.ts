import { belongsTo, hasMany, model, property } from '@loopback/repository';
import { CONTEST_SCORING_OPTIONS, CONTEST_STATUSES } from '@src/utils/constants';
import { Base } from './base.model';
import { Contender } from './contender.model';
import { Game } from './game.model';
import { Player } from './player.model';
import { User } from './user.model';
import { Spread } from '@src/models/spread.model';

@model()
export class Contest extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    entry: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorPlayerProjDiff: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerPlayerProjDiff: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorPlayerCover: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerPlayerCover: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorPlayerToWin: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerPlayerToWin: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorPlayerMaxWin: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerPlayerMaxWin: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorPlayerSpreadValue: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerPlayerSpreadValue: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    spreadValue: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    mlValue: number;

    @property({
        type: 'string',
        required: true,
        default: CONTEST_STATUSES.OPEN,
    })
    status: CONTEST_STATUSES;

    @property({
        type: 'boolean',
        required: false,
        default: false,
    })
    ended: boolean;

    @property({
        type: 'date',
        required: false,
        default: null,
    })
    endedAt: Date | null;

    @belongsTo(() => User)
    creatorId: number;

    @belongsTo(() => Spread)
    spreadId: number;

    @belongsTo(() => Player)
    creatorPlayerId: number;

    @belongsTo(() => Player)
    claimerPlayerId: number;

    constructor(data?: Partial<Contest>) {
        super(data);
    }
}

export interface ContestRelations {
    creator?: User;
    creatorPlayer?: Player;
    claimerPlayer?: Player;
    spread?: Spread;
}

export type ContestWithRelations = Contest & ContestRelations;
