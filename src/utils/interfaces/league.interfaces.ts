import { League } from '@src/models';

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
