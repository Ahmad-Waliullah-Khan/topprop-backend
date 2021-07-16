import {League} from '@src/models';

export interface ILeagueImportRequest extends League {
  espnS2?: string;
  swid?: string;
  source: string;
}
