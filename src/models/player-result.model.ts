import { belongsTo, model, property } from '@loopback/repository';
import { Base } from '.';
import { Player } from './player.model';

@model()
export class PlayerResult extends Base {
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
    points: number;

    @belongsTo(() => Player)
    playerId: number;

    constructor(data?: Partial<PlayerResult>) {
        super(data);
    }
}

export interface PlayerResultRelations {
    // describe navigational properties here
    player?: Player;
}

export type PlayerResultWithRelations = PlayerResult & PlayerResultRelations;
