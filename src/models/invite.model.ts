import {belongsTo, model, property} from '@loopback/repository';
import {Base} from '.';
import {League, LeagueWithRelations} from './league.model';
import {Member, MemberWithRelations} from './member.model';
import {Team, TeamWithRelations} from './team.model';

@model()
export class Invite extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'string',
        required: true,
    })
    email: string;

    @property({
        type: 'string',
    })
    token: string;

    @property({
        type: 'boolean',
    })
    tokenExpired: boolean;

    @belongsTo(() => League)
    leagueId: number;

    @belongsTo(() => Team)
    teamId?: number;

    @belongsTo(() => Member)
    memberId: number;

    constructor(data?: Partial<Invite>) {
        super(data);
    }
}

export interface InviteRelations {
    // describe navigational properties here
    // league?: LeagueWithRelations;
    // team?: TeamWithRelations;
    // member?: MemberWithRelations;
}

export type InviteWithRelations = Invite & InviteRelations;
