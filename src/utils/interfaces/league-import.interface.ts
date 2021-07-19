import {League} from '@src/models';

export interface ILeaguesImportRequestYahoo extends League {
    code: string;
}

export interface ILeagueFetchRequestEspn extends League {
  espnS2: string;
  swid: string;
  leagueId: number;
  importSource?: string;
}
export interface ILeagueFetchRequestYahoo extends League {
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
  scoringType: number;
  name: string;
  importSource?: string;
}
