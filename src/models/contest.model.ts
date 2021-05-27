import { belongsTo, hasMany, model, property, hasOne } from '@loopback/repository';
import { CONTEST_STAKEHOLDERS, CONTEST_STATUSES, CONTEST_TYPES } from '@src/utils/constants';
import { Base } from './base.model';
import { Contender } from './contender.model';
import { Game } from './game.model';
import { Player, PlayerWithRelations } from './player.model';
import { User, UserWithRelations } from './user.model';
import { Spread, SpreadWithRelations } from '@src/models/spread.model';

@model()
export class Contest extends Base {
  @property({
    id: true,
    generated: true,
    type: 'Number',
    description: 'The unique identifier for a contest',
  })
  id: number;

  @property({
    type: 'number',
    required: true,
    description: 'Entry amount in dollars for the contest. Would be the same for creator and claimer',
    postgresql: {
      dataType: 'decimal',
    },
  })
  entryAmount: number;

  @property({
    type: 'number',
    required: true,
    description: 'Projected Fantasy points for creator player at the time of contest creation. Posterity purposes ',
    postgresql: {
      dataType: 'decimal',
    },
  })
  creatorPlayerProjFantasyPoints: number;

  @property({
    type: 'number',
    required: true,
    description: 'Projected Fantasy points for claimer player at the time of contest creation. Posterity purposes ',
    postgresql: {
      dataType: 'decimal',
    },
  })
  claimerPlayerProjFantasyPoints: number;

  @property({
    type: 'number',
    required: true,
    description: 'Cover for creator player at the time of contest creation',
    postgresql: {
      dataType: 'decimal',
    },
  })
  creatorPlayerCover: number;

  @property({
    type: 'number',
    required: true,
    description: 'Cover for claimer player at the time of contest creation',
    postgresql: {
      dataType: 'decimal',
    },
  })
  claimerPlayerCover: number;

  @property({
    type: 'number',
    required: true,
    description: 'Win Bonus for creator player at the time of contest creation. Only >0 if winBonus flag is set',
    postgresql: {
      dataType: 'decimal',
    },
  })
  creatorPlayerWinBonus: number;

  @property({
    type: 'number',
    required: true,
    description: 'Win Bonus for claimer player at the time of contest creation. Only >0 if winBonus flag is set',
    postgresql: {
      dataType: 'decimal',
    },
  })
  claimerPlayerWinBonus: number;

  @property({
    type: 'number',
    required: true,
    description: 'FP Spread for creator player at the time of contest creation',
    postgresql: {
      dataType: 'decimal',
    },
  })
  creatorPlayerSpread: number;

  @property({
    type: 'number',
    required: true,
    description: 'FP Spread for claimer player at the time of contest creation',
    postgresql: {
      dataType: 'decimal',
    },
  })
  claimerPlayerSpread: number;

  @property({
    type: 'number',
    required: true,
    postgresql: {
      dataType: 'decimal',
    },
  })
  creatorPlayerMaxWin: number;

  @property({
    type: 'number',
    required: true,
    postgresql: {
      dataType: 'decimal',
    },
  })
  claimerPlayerMaxWin: number;

  @property({
    type: 'number',
    required: true,
    postgresql: {
      dataType: 'decimal',
    },
  })
  spreadValue: number;

  @property({
    type: 'number',
    required: true,
    postgresql: {
      dataType: 'decimal',
    },
  })
  mlValue: number;

  @property({
    type: 'string',
    required: true,
    default: CONTEST_TYPES.LOBBY,
  })
  type: CONTEST_TYPES;

  @property({
    type: 'string',
    required: true,
    default: CONTEST_STATUSES.OPEN,
  })
  status: CONTEST_STATUSES;

  @property({
    type: 'boolean',
    required: false,
    default: false,
  })
  ended: boolean;

  @property({
    type: 'date',
    required: false,
    default: null,
  })
  endedAt: Date | null;

  @property({
    type: 'string',
    default: null,
  })
  winnerLabel: CONTEST_STAKEHOLDERS;

  @property({
    type: 'number',
    default: null,
    postgresql: {
      dataType: 'decimal',
    },
  })
  creatorWinAmount: number;

  @property({
    type: 'number',
    default: null,
    postgresql: {
      dataType: 'decimal',
    },
  })
  claimerWinAmount: number;

  @property({
    type: 'number',
    required: true,
    default: 0,
    postgresql: {
      dataType: 'decimal',
    },
  })
  topPropProfit: number;

  @belongsTo(() => User)
  winnerId: number;

  @belongsTo(() => User)
  creatorId: number;

  @belongsTo(() => User)
  claimerId: number;

  @belongsTo(() => Player)
  creatorPlayerId: number;

  @belongsTo(() => Player)
  claimerPlayerId: number;

  @belongsTo(() => Spread)
  spreadId: number;

  constructor(data?: Partial<Contest>) {
    super(data);
  }
}

export interface ContestRelations {
    winner?: UserWithRelations;
    creator?: UserWithRelations;
    creatorPlayer?: PlayerWithRelations;
    claimerPlayer?: PlayerWithRelations;
    spread?: SpreadWithRelations;
}

export type ContestWithRelations = Contest & ContestRelations;
