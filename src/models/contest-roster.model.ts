import {belongsTo, model, property} from '@loopback/repository';
import {Base} from '.';
import {Player, PlayerWithRelations} from './player.model';
import {ContestTeam, ContestTeamWithRelations} from './contest-team.model';

@model()
export class ContestRoster extends Base {
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
      playerFantasyPoints: number;

    @belongsTo(() => ContestTeam)
    contestTeamId: number;

    @belongsTo(() => Player)
    playerId: number;

    constructor(data?: Partial<ContestRoster>) {
        super(data);
    }
}

export interface ContestRosterRelations {
    // describe navigational properties here
    player?: PlayerWithRelations;
    contestTeam?: ContestTeamWithRelations;
}

export type ContestRosterWithRelations = ContestRoster & ContestRosterRelations;
