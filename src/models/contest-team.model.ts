import { belongsTo, model, property, hasMany } from '@loopback/repository';
import { Base } from '.';
import { Team, TeamWithRelations } from './team.model';
import { ContestRoster } from './contest-roster.model';

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

    @hasMany(() => ContestRoster)
    contestRosters?: ContestRoster[];

    constructor(data?: Partial<ContestTeam>) {
        super(data);
    }
}

export interface ContestTeamRelations {
    // describe navigational properties here
    team?: TeamWithRelations;
}

export type ContestTeamWithRelations = ContestTeam & ContestTeamRelations;
