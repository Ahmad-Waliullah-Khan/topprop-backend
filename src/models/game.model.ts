import { belongsTo, model, property } from '@loopback/repository';
import { GAME_TYPES } from '@src/utils/constants';
import { Base } from '.';
import { Team } from './team.model';

@model()
export class Game extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
        required: true,
    })
    week: number;

    @property({
        type: 'string',
        required: true,
    })
    type: GAME_TYPES;

    @property({
        type: 'date',
        required: true,
    })
    startTime: Date;

    @property({
        type: 'number',
        required: false,
        index: true,
    })
    remoteId: number;

    @property({
        type: 'number',
        required: false,
    })
    season: number;

    @property({
        type: 'boolean',
        default: false,
    })
    finished: boolean;

    @belongsTo(() => Team)
    homeTeamId: number;

    @belongsTo(() => Team)
    visitorTeamId: number;

    constructor(data?: Partial<Game>) {
        super(data);
    }
}

export interface GameRelations {
    visitorTeam?: Team;
    homeTeam?: Team;
    // describe navigational properties here
}

export type GameWithRelations = Game & GameRelations;
