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
    inverse?: boolean;
    type: CONTEST_TYPES;
}
