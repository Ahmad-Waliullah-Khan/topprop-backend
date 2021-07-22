import {belongsTo, model, property} from '@loopback/repository';
import {Base} from '.';
import {Player, PlayerWithRelations} from './player.model';
import {Team, TeamWithRelations} from './team.model';

@model()
export class ContestRoster extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @belongsTo(() => Team)
    teamId: number;

    @belongsTo(() => Player)
    playerId: number;

    constructor(data?: Partial<ContestRoster>) {
        super(data);
    }
}

export interface ContestRosterRelations {
    // describe navigational properties here
    player?: PlayerWithRelations;
    team?: TeamWithRelations;
}

export type ContestRosterWithRelations = ContestRoster & ContestRosterRelations;
