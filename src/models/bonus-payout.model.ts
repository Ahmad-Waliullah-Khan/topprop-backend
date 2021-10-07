import {Model, model, property} from '@loopback/repository';
import { Base } from '.';
import { STATUS } from '@src/utils/constants';

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
    required: true,
  })
  userId: number;

  @property({
    type: 'number',
    required: true,
  })
  amount: number;

  @property({
    type: 'string',
    required: true,
  })
  message: string;

  @property({
    type: 'string',
    required: true,
    default: STATUS.PENDING,
  })
  status: string;

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
