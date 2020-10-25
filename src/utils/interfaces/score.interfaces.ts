// Generated by https://quicktype.io

import { IStadiumDetails } from './stadium.interfaces';

export interface IRemoteScore {
    GameKey: string;
    SeasonType: number;
    Season: number;
    Week: number;
    Date: string;
    AwayTeam: string;
    HomeTeam: string;
    AwayScore: number;
    HomeScore: number;
    Channel: string;
    PointSpread: number;
    OverUnder: number;
    Quarter: string;
    TimeRemaining: null;
    Possession: null;
    Down: null;
    Distance: null;
    YardLine: null;
    YardLineTerritory: null;
    RedZone: null;
    AwayScoreQuarter1: number;
    AwayScoreQuarter2: number;
    AwayScoreQuarter3: number;
    AwayScoreQuarter4: number;
    AwayScoreOvertime: number;
    HomeScoreQuarter1: number;
    HomeScoreQuarter2: number;
    HomeScoreQuarter3: number;
    HomeScoreQuarter4: number;
    HomeScoreOvertime: number;
    HasStarted: boolean;
    IsInProgress: boolean;
    IsOver: boolean;
    Has1stQuarterStarted: boolean;
    Has2ndQuarterStarted: boolean;
    Has3rdQuarterStarted: boolean;
    Has4thQuarterStarted: boolean;
    IsOvertime: boolean;
    DownAndDistance: null;
    QuarterDescription: string;
    StadiumID: number;
    LastUpdated: string;
    GeoLat: null;
    GeoLong: null;
    ForecastTempLow: number;
    ForecastTempHigh: number;
    ForecastDescription: string;
    ForecastWindChill: number;
    ForecastWindSpeed: number;
    AwayTeamMoneyLine: number;
    HomeTeamMoneyLine: number;
    Canceled: boolean;
    Closed: boolean;
    LastPlay: null;
    Day: string;
    DateTime: string;
    AwayTeamID: number;
    HomeTeamID: number;
    GlobalGameID: number;
    GlobalAwayTeamID: number;
    GlobalHomeTeamID: number;
    PointSpreadAwayTeamMoneyLine: number;
    PointSpreadHomeTeamMoneyLine: number;
    ScoreID: number;
    Status: string;
    GameEndDateTime: string;
    HomeRotationNumber: number;
    AwayRotationNumber: number;
    NeutralVenue: boolean;
    StadiumDetails: IStadiumDetails;
}
