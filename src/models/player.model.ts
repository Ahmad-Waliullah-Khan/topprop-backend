import { belongsTo, model, property } from '@loopback/repository';
import { Base } from '.';
import { Team } from './team.model';

@model()
export class Player extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @belongsTo(() => Team)
    teamId: number;

    constructor(data?: Partial<Player>) {
        super(data);
    }
}

export interface PlayerRelations {
    // describe navigational properties here
    team?: Team;
}

export type PlayerWithRelations = Player & PlayerRelations;
