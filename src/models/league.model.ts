import { v4 as uuidv4 } from 'uuid';
import { belongsTo, hasMany, model, property } from '@loopback/repository';
import { Base } from '.';
import { ImportSource } from './import-source.model';
import { ScoringType, ScoringTypeRelations } from './scoring-type.model';
import { Team } from './team.model';
import { User, UserWithRelations } from './user.model';
import { Member } from './member.model';

@model()
export class League extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'string',
        required: false,
    })
    remoteId: string;

    @property({
        type: 'string',
        required: true,
    })
    name: string;

    @property({
        type: 'string',
        required: true,
    })
    syncStatus: string;

    @property({
        type: 'date',
        required: false,
        default: null,
    })
    lastSyncTime: Date | null;

    @property({
        type: 'string',
        generated: false,
        useDefaultIdType: false,
        default: () => uuidv4(),
        postgresql: {
            dataType: 'uuid',
        },
    })
    inviteToken: string;

    @hasMany(() => Team)
    teams?: Team[];

    @hasMany(() => Member)
    members?: Member[];

    @belongsTo(() => User)
    userId: number;

    @belongsTo(() => ScoringType)
    scoringTypeId: number;

    @belongsTo(() => ImportSource)
    importSourceId: number;

    constructor(data?: Partial<League>) {
        super(data);
    }
}

export interface LeagueRelations {
    // describe navigational properties here
    user?: UserWithRelations;
    scoringType?: ScoringTypeRelations;
}

export type LeagueWithRelations = League & LeagueRelations;
