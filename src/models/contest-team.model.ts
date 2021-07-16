import {belongsTo, model, property} from '@loopback/repository';
import {Base} from '.';
import {Team, TeamWithRelations} from './team.model';

@model()
export class ContestTeam extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @belongsTo(() => Team)
    teamId: number;

    constructor(data?: Partial<ContestTeam>) {
        super(data);
    }
}

export interface ContestTeamRelations {
    // describe navigational properties here
    team?: TeamWithRelations;
}

export type ContestTeamWithRelations = ContestTeam & ContestTeamRelations;
