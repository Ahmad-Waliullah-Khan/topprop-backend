import {belongsTo, hasMany, model, property} from '@loopback/repository';
import {Base} from '.';
import {ImportSource} from './import-source.model';
import {ScoringType} from './scoring-type.model';
import {Team} from './team.model';
import {User, UserWithRelations} from './user.model';

@model()
export class League extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
        required: false,
    })
    remoteId: number;

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
        required: false,
    })
    yahooAccessToken: string;

    @property({
        type: 'string',
        required: false,
    })
    yahooRefreshToken: string;

    @hasMany(() => Team)
    teams: Team[];

    @belongsTo(() => User)
    userId: number;

    @belongsTo(() => ScoringType)
    scoringId: number;

    @belongsTo(() => ImportSource)
    sourceId: number;


    constructor(data?: Partial<League>) {
        super(data);
    }
}

export interface LeagueRelations {
    // describe navigational properties here
    user?: UserWithRelations;
    teams?: Team[];
    scoringTypes?: ScoringType[];
    importSources?: ImportSource[];
}

export type LeagueWithRelations = League & LeagueRelations;
