export interface IImportedPlayer {
    name: string;
    points0: number;
    points2: number;
    points4: number;
    points6: number;
    points8: number;
    points10: number;
    points12: number;
    points14: number;
    points16: number;
    points18: number;
    points20: number;
    points22: number;
    points24: number;
    points26: number;
    points28: number;
    points30: number;
    points32: number;
    points34: number;
    points36: number;
    points38: number;
    points40: number;
    points42: number;
    points44: number;
    points46: number;
    points48: number;
    points50: number;
    position: string;
    team: string;
}

export interface IRemotePlayer {
    PlayerID: number;
    Team: string;
    Number: number;
    FirstName: string;
    LastName: string;
    Position: string;
    Status: string;
    Height: string;
    Weight: number;
    BirthDate: string;
    College: string;
    Experience: number;
    FantasyPosition: string;
    Active: boolean;
    PositionCategory: string;
    Name: string;
    Age: number;
    ExperienceString: string;
    BirthDateString: string;
    PhotoUrl: string;
    ByeWeek: number;
    UpcomingGameOpponent: string;
    UpcomingGameWeek: number;
    ShortName: string;
    AverageDraftPosition: null;
    DepthPositionCategory: string;
    DepthPosition: string;
    DepthOrder: number;
    DepthDisplayOrder: number;
    CurrentTeam: string;
    CollegeDraftTeam: string;
    CollegeDraftYear: number;
    CollegeDraftRound: null;
    CollegeDraftPick: null;
    IsUndraftedFreeAgent: boolean;
    HeightFeet: number;
    HeightInches: number;
    UpcomingOpponentRank: number;
    UpcomingOpponentPositionRank: number;
    CurrentStatus: string;
    UpcomingSalary: number;
    FantasyAlarmPlayerID: number;
    SportRadarPlayerID: string;
    RotoworldPlayerID: null;
    RotoWirePlayerID: number;
    StatsPlayerID: null;
    SportsDirectPlayerID: number;
    XmlTeamPlayerID: null;
    FanDuelPlayerID: number;
    DraftKingsPlayerID: number;
    YahooPlayerID: number;
    InjuryStatus: null;
    InjuryBodyPart: null;
    InjuryStartDate: null;
    InjuryNotes: null;
    FanDuelName: string;
    DraftKingsName: string;
    YahooName: string;
    FantasyPositionDepthOrder: number;
    InjuryPractice: null;
    InjuryPracticeDescription: null;
    DeclaredInactive: boolean;
    UpcomingFanDuelSalary: null;
    UpcomingDraftKingsSalary: null;
    UpcomingYahooSalary: null;
    TeamID: number;
    GlobalTeamID: number;
    FantasyDraftPlayerID: null;
    FantasyDraftName: null;
    UsaTodayPlayerID: number;
    UsaTodayHeadshotUrl: string;
    UsaTodayHeadshotNoBackgroundUrl: string;
    UsaTodayHeadshotUpdated: string;
    UsaTodayHeadshotNoBackgroundUpdated: string;
}
