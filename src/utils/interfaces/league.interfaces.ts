import {League, LeagueContest} from '@src/models';

export interface ILeagueInvitesRequest extends League {
    leagueId: string;
    invitees: { email: string; teamId: number | null }[];
}

export interface ILeagueInvitesFetchRequest extends League {
    token: string;
}

export interface ILeagueInvitesJoinRequest extends League {
    inviteId: number;
}

export interface ILeagueCalculateRequest extends LeagueContest {
    creatorTeamId: number;
    claimerTeamId: number;
    entryAmount: number;
}

export interface ILeagueCreateRequest extends LeagueContest {
    creatorTeamId: number;
    claimerTeamId: number;
    entryAmount: number;
    winBonus: boolean;
}

export interface ILeagueClaimContestRequest extends LeagueContest {
    leagueContestId: number;
}

export interface ILeagueResync extends League {
    leagueId: number;
//    importSourceId: number;
}
