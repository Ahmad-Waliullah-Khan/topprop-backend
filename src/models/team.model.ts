import {belongsTo, hasMany, model, property} from '@loopback/repository';
import {Base} from '.';
import {League, LeagueWithRelations} from './league.model';
import {Player} from './player.model';
import {Roster} from './roster.model';
import {User, UserWithRelations} from './user.model';

@model()
export class Team extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    // @property({
    //     type: 'string',
    //     // required: true,
    // })
    // league: string;

    @property({
        type: 'string',
        // required: true,
    })
    abbr: string;

    @property({
        type: 'string',
        // required: true,
    })
    slug: string;

    @property({
        type: 'string',
        required: true,
    })
    name: string;

    @property({
        type: 'string',
        required: false,
    })
    remoteId: string;

    @property({
        type: 'string',
        required: false,
    })
    logoUrl: string;

    @property({
        type: 'string',
        required: false,
    })
    wordMarkUrl: string;

    @hasMany(() => Roster)
    rosters: Roster[];

    @belongsTo(() => User)
    userId: number;

    @belongsTo(() => League)
    leagueId: number;

    constructor(data?: Partial<Team>) {
        super(data);
    }
}

export interface TeamRelations {
    // describe navigational properties here
    // players?: Player[];
    user?: UserWithRelations;
    league?: LeagueWithRelations;
}

export type TeamWithRelations = Team & TeamRelations;
