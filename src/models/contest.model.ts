import { belongsTo, hasMany, model, property } from '@loopback/repository';
import { CONTEST_SCORING_OPTIONS, CONTEST_STATUSES } from '@src/utils/constants';
import { Base } from './base.model';
import { Contender } from './contender.model';
import { Game } from './game.model';
import { Player } from './player.model';
import { User } from './user.model';

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
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    fantasyPoints: number;

    @property({
        type: 'string',
        required: false,
    })
    scoring: CONTEST_SCORING_OPTIONS;

    @property({
        type: 'string',
        required: false,
        default: CONTEST_STATUSES.OPEN,
    })
    status: CONTEST_STATUSES;

    @belongsTo(() => Player)
    playerId: number;

    @belongsTo(() => Game)
    gameId: number;

    @hasMany(() => Contender)
    contenders: Contender[];

    @belongsTo(() => User)
    creatorId: number;

    constructor(data?: Partial<Contest>) {
        super(data);
    }
}

export interface ContestRelations {
    game?: Game;
    player?: Player;
    creator?: User;
}

export type ContestWithRelations = Contest & ContestRelations;
