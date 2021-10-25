import { Contest } from '@src/models';
import { CONTEST_TYPES } from '../constants';

export interface IContestRequest extends Contest {
    // type?: CONTEST_TYPES;
    toRiskAmount?: number;
    toWinAmount?: number;
    creatorId: number;
    creatorPlayerId: number;
    claimerPlayerId: number;
    entry: number;
    winBonus: boolean;
}

export interface IContestCreateRequest extends Contest {
    creatorPlayerId: number;
    claimerPlayerId: number;
    entryAmount: number;
    winBonus: boolean;
}

export interface IContestClaimRequest extends Contest {
    contestId: number;
}

export interface IContestResponses {
    myContests: Contest[];
    contests: Contest[];
}

export interface ICalculateToWinRequest {
    toRiskAmount: number;
    fantasyPoints: number;
    playerId: number;
    matching?: boolean;
    type: CONTEST_TYPES;
}
export interface ICalculateRiskToMatchRequest {
    fantasyPoints: number;
    playerId: number;
    type: CONTEST_TYPES;
    initialRiskAmount: number;
}

export interface IScheduledGame {
    gameKey: string | null;
    season: number;
    week: number;
    date: string | null;
    awayTeam: string;
    homeTeam: string;
    dateTime: string | null;
}
