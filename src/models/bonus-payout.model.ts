import {Model, model, property} from '@loopback/repository';
import { Base } from '.';

@model({settings: {strict: false}})
export class BonusPayout extends Base {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id: number;

  @property({
    type: 'number',
  })
  amount: number;

  @property({
    type: 'string',
  })
  message: string;

  @property({
    type: 'number',
    required: true,
  })
  status: number;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<BonusPayout>) {
    super(data);
  }
}

export interface BonusPayoutRelations {
  // describe navigational properties here
}

export type BonusPayoutWithRelations = BonusPayout & BonusPayoutRelations;
