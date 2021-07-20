import {League} from '@src/models';

export interface ILeaguesFetchRequestYahoo extends League {
    code: string;
}

export interface ILeagueFetchRequestEspn extends League {
  espnS2: string;
  swid: string;
  leagueId: number;
  importSource?: string;
}
export interface ILeagueFetchRequestYahooOld extends League {
  leagueKey: number;
  importSource?: string;
}

export interface ILeagueImportRequestEspn extends League {
  espnS2: string;
  swid: string;
  leagueId: number;
  scoringType: number;
  name: string;
  importSource?: string;
}

export interface ILeagueImportRequestYahoo extends League {
  leagueKey: number;
  scoringTypeId: number;
  accessToken: string;
  refreshToken: string;
  userId: number;
}
