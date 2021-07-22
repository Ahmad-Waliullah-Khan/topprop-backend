import {belongsTo, model, property} from '@loopback/repository';
import {Base} from '.';
import {League, LeagueWithRelations} from './league.model';
import {User, UserWithRelations} from './user.model';

@model()
export class Member extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @belongsTo(() => League)
    leagueId: number;

    @belongsTo(() => User)
    userId: number;

    constructor(data?: Partial<Member>) {
        super(data);
    }
}

export interface MemberRelations {
    // describe navigational properties here
    league?: LeagueWithRelations;
    user?: UserWithRelations;
}

export type MemberWithRelations = Member & MemberRelations;
