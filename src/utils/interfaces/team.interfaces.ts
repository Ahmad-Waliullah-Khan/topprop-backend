import { IStadiumDetails } from './stadium.interfaces';

export interface IRemoteTeam {
    Key: string;
    TeamID: number;
    PlayerID: number;
    City: string;
    Name: string;
    Conference: string;
    Division: string;
    FullName: string;
    StadiumID: number;
    ByeWeek: number;
    AverageDraftPosition: number;
    AverageDraftPositionPPR: number;
    HeadCoach: string;
    OffensiveCoordinator: string;
    DefensiveCoordinator: string;
    SpecialTeamsCoach: string;
    OffensiveScheme: string;
    DefensiveScheme: string;
    UpcomingSalary: number;
    UpcomingOpponent: string;
    UpcomingOpponentRank: number;
    UpcomingOpponentPositionRank: number;
    UpcomingFanDuelSalary: number;
    UpcomingDraftKingsSalary: number;
    UpcomingYahooSalary: number;
    PrimaryColor: string;
    SecondaryColor: string;
    TertiaryColor: string;
    QuaternaryColor: string;
    WikipediaLogoUrl: string;
    WikipediaWordMarkUrl: string;
    GlobalTeamID: number;
    DraftKingsName: string;
    DraftKingsPlayerID: number;
    FanDuelName: string;
    FanDuelPlayerID: number;
    FantasyDraftName: string;
    FantasyDraftPlayerID: number;
    YahooName: string;
    YahooPlayerID: null;
    AverageDraftPosition2QB: number;
    AverageDraftPositionDynasty: number;
    StadiumDetails: IStadiumDetails;
}

// Generated by https://quicktype.io

export interface ITimeFrame {
    SeasonType: number;
    Season: number;
    Week: number;
    Name: string;
    ShortName: string;
    StartDate: string;
    EndDate: string;
    FirstGameStart: string;
    FirstGameEnd: string;
    LastGameEnd: string;
    HasGames: boolean;
    HasStarted: boolean;
    HasEnded: boolean;
    HasFirstGameStarted: boolean;
    HasFirstGameEnded: boolean;
    HasLastGameEnded: boolean;
    ApiSeason: string;
    ApiWeek: string;
}
