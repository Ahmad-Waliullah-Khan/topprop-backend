import { League } from '@src/models';

export interface ILeaguesFetchRequestYahoo extends League {
    code: string;
}

export interface ILeagueFetchRequestEspn extends League {
    espnS2: string;
    swid: string;
}

export interface ILeagueImportRequestEspn extends League {
    espnS2: string;
    swid: string;
    leagueId: number;
    source?: string;
}
export interface ILeagueImportRequestYahoo extends League {
    leagueKey: string;
    accessToken: string;
    refreshToken: string;
    scoringTypeId: number;
}