import {belongsTo, model, property} from '@loopback/repository';
import {Base, Player} from '.';
import {PlayerWithRelations} from './player.model';

@model()
export class CronLog extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
      type: 'string',
      required: false,
    })
    cronHash: string;

    @property({
        type: 'string',
        required: true,
    })
    cronName: string;

    @property({
      type: 'string',
      required: true,
    })
    env: string;

    @property({
      type: 'array',
      itemType: 'string',
    })
    tablesAffected: string[];

    @property({
      type: 'array',
      itemType: 'string',
    })
    changesMade: string[];

    @property({
      type: 'string',
      required: false,
    })
    cronDescription: string;

    @belongsTo(() => Player)
    playerId?: number;

}

export interface CronLogRelations {
  player?: PlayerWithRelations;
}

export type CronLogWithRelations = CronLog & CronLogRelations;
