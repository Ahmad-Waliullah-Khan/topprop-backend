import { model, property } from '@loopback/repository';
import { Base } from '.';

@model({ settings: { strict: true } })
export class Timeframe extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
    })
    seasonType: number;

    @property({
        type: 'number',
    })
    season: number;

    @property({
        type: 'number',
    })
    week: number;

    @property({
        type: 'string',
    })
    name: string;

    @property({
        type: 'string',
        required: true,
    })
    shortName: string;

    @property({
        type: 'date',
        required: true,
    })
    startDate: string;

    @property({
        type: 'date',
        required: true,
    })
    endDate: string;

    @property({
        type: 'date',
    })
    firstGameStart: string;

    @property({
        type: 'date',
    })
    firstGameEnd: string;

    @property({
        type: 'date',
    })
    lastGameEnd: string;

    @property({
        type: 'boolean',
    })
    hasGames: boolean;

    @property({
        type: 'boolean',
    })
    hasStarted: boolean;

    @property({
        type: 'boolean',
    })
    hasEnded: boolean;

    @property({
        type: 'boolean',
    })
    hasFirstGameStarted: boolean;

    @property({
        type: 'boolean',
    })
    hasFirstGameEnded: boolean;

    @property({
        type: 'boolean'
    })
    hasLastGameEnded: boolean;

    @property({
        type: 'string',
    })
    apiSeason: string;

    @property({
        type: 'string',
    })
    apiWeek: string;

    // Define well-known properties here

    // Indexer property to allow additional data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [prop: string]: any;

    constructor(data?: Partial<Timeframe>) {
        super(data);
    }
}

export interface TimeframeRelations {
    // describe navigational properties here
}

export type TimeframeWithRelations = Timeframe & TimeframeRelations;
