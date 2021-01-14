import { Contest } from '@src/models';
import { CONTEST_TYPES } from '../constants';

export interface IContestRequest extends Contest {
    type?: CONTEST_TYPES;
    toRiskAmount?: number;
    toWinAmount?: number;
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
