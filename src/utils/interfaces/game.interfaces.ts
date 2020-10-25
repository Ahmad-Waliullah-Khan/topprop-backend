// Generated by https://quicktype.io

import { IStadiumDetails } from './stadium.interfaces';

export interface IRemoteGame {
    GameKey: string;
    SeasonType: number;
    Season: number;
    Week: number;
    Date: string;
    AwayTeam: string;
    HomeTeam: string;
    Channel: string;
    PointSpread: number;
    OverUnder: number;
    StadiumID: number;
    Canceled: boolean;
    GeoLat: null;
    GeoLong: null;
    ForecastTempLow: number;
    ForecastTempHigh: number;
    ForecastDescription: string;
    ForecastWindChill: number;
    ForecastWindSpeed: number;
    AwayTeamMoneyLine: number;
    HomeTeamMoneyLine: number;
    Day: string;
    DateTime: string;
    GlobalGameID: number;
    GlobalAwayTeamID: number;
    GlobalHomeTeamID: number;
    ScoreID: number;
    Status: string;
    StadiumDetails: IStadiumDetails;
}
