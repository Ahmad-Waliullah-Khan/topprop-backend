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
    sourceId: number;

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
        type: 'number',
        required: false,
    })
    scoringTypeId: number;

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

    @hasMany(() => Team)
    teams: Team[];

    @belongsTo(() => User)
    userId: number;

    @hasMany(() => ScoringType)
    scoringType: ScoringType[];

    @hasMany(() => ImportSource)
    importSource: ImportSource[];


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
