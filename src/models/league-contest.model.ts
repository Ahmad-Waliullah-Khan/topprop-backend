import { belongsTo, model, property } from '@loopback/repository';
import { Spread, SpreadWithRelations } from '@src/models/spread.model';
import { CONTEST_STAKEHOLDERS, CONTEST_STATUSES, CONTEST_TYPES } from '@src/utils/constants';
import { Base } from './base.model';
import { League, LeagueWithRelations } from './league.model';
import { Team, TeamWithRelations } from './team.model';
import { User, UserWithRelations } from './user.model';
import { ContestTeam, ContestTeamWithRelations } from './contest-team.model';

@model()
export class LeagueContest extends Base {
    @property({
        id: true,
        generated: true,
        type: 'Number',
        description: 'The unique identifier for a LeagueContest',
    })
    id: number;

    @property({
        type: 'number',
        required: true,
        description: 'Entry amount in dollars for the LeagueContest. Would be the same for creator and claimer',
        postgresql: {
            dataType: 'decimal',
        },
    })
    entryAmount: number;

    @property({
        type: 'number',
        required: true,
        description:
            'Projected Fantasy points for creator player at the time of LeagueContest creation. Posterity purposes ',
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorTeamProjFantasyPoints: number;

    @property({
        type: 'number',
        required: true,
        description:
            'Projected Fantasy points for claimer player at the time of LeagueContest creation. Posterity purposes ',
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerTeamProjFantasyPoints: number;

    @property({
        type: 'number',
        required: true,
        description: 'Cover for creator player at the time of LeagueContest creation',
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorTeamCover: number;

    @property({
        type: 'number',
        required: true,
        description: 'Cover for claimer player at the time of LeagueContest creation',
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerTeamCover: number;

    @property({
        type: 'number',
        required: true,
        description:
            'Win Bonus for creator player at the time of LeagueContest creation. Only >0 if winBonus flag is set',
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorTeamWinBonus: number;

    @property({
        type: 'number',
        required: true,
        description:
            'Win Bonus for claimer player at the time of LeagueContest creation. Only >0 if winBonus flag is set',
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerTeamWinBonus: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorTeamFantasyPoints: number;

    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerTeamFantasyPoints: number;

    @property({
        type: 'number',
        required: true,
        description: 'FP Spread for creator player at the time of LeagueContest creation',
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorTeamSpread: number;

    @property({
        type: 'number',
        required: true,
        description: 'FP Spread for claimer player at the time of LeagueContest creation',
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerTeamSpread: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    creatorTeamMaxWin: number;

    @property({
        type: 'number',
        required: true,
        postgresql: {
            dataType: 'decimal',
        },
    })
    claimerTeamMaxWin: number;

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
        default: CONTEST_TYPES.LEAGUE,
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

    @belongsTo(() => Team)
    creatorTeamId: number;

    @belongsTo(() => Team)
    claimerTeamId: number;

    @belongsTo(() => Spread)
    spreadId: number;

    @belongsTo(() => League)
    leagueId: number;

    @belongsTo(() => ContestTeam)
    creatorContestTeamId: number;

    @belongsTo(() => ContestTeam)
    claimerContestTeamId: number;

    constructor(data?: Partial<LeagueContest>) {
        super(data);
    }
}

export interface LeagueContestRelations {
    winner?: UserWithRelations;
    creator?: UserWithRelations;
    claimer?: UserWithRelations;
    creatorTeam?: TeamWithRelations;
    claimerTeam?: TeamWithRelations;
    creatorContestTeam?: ContestTeamWithRelations;
    claimerContestTeam?: ContestTeamWithRelations;
    spread?: SpreadWithRelations;
    league: LeagueWithRelations;
}

export type LeagueContestWithRelations = LeagueContest & LeagueContestRelations;
