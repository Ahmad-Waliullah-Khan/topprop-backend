import { League } from '@src/models';

export interface ILeaguesImportRequestYahoo extends League {
    code: string;
}

export interface ILeagueImportRequestEspn extends League {
    espnS2: string;
    swid: string;
    leagueId: number;
    source?: string;
}
export interface ILeagueImportRequestYahoo extends League {
    leagueKey: number;
    source?: string;
}
