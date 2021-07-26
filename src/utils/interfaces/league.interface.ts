import {LeagueContest} from '@src/models';

export interface ILeagueCreateRequest extends LeagueContest {
    creatorTeamId: number;
    claimerTeamId: number;
    entryAmount: number;
    winBonus: boolean;
}

export interface ILeagueClaimContestRequest extends LeagueContest {
    leagueContestId: number;
}
