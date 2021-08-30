import {belongsTo, model, property} from '@loopback/repository';
import {Base} from '.';
import {Player, PlayerWithRelations} from './player.model';
import {Team, TeamWithRelations} from './team.model';

@model()
export class Roster extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'string',
    })
    displayPosition: string;

    @belongsTo(() => Team)
    teamId: number;

    @belongsTo(() => Player)
    playerId: number;

    constructor(data?: Partial<Roster>) {
        super(data);
    }
}

export interface RosterRelations {
    // describe navigational properties here
    player?: PlayerWithRelations;
    team?: TeamWithRelations;
}

export type RosterWithRelations = Roster & RosterRelations;
