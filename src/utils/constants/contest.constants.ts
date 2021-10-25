export enum CONTEST_SCORING_OPTIONS {
    STD = 'standard',
    PPR = 'ppr',
    HALF_PPR = 'half-ppr',
}

export enum CONTEST_STATUSES {
    OPEN = 'open',
    MATCHED = 'matched',
    UNMATCHED = 'unmatched',
    CLOSED = 'closed',
}
export enum CONTEST_TYPES {
    LOBBY = 'lobby',
    LEAGUE = 'league',
    OVER = 'over',
    UNDER = 'under',
}

export enum CONTEST_STAKEHOLDERS {
    CREATOR = 'creator',
    CLAIMER = 'claimer',
    PUSH = 'push',
    PENDING = 'pending',
    UNMATCHED = 'unmatched',
}

export enum TIMEFRAMES {
    CURRENT = 'current',
    UPCOMING = 'upcoming',
    COMPLETED = 'completed',
    RECENT = 'recent',
    ALL = 'all',
}

const tsOffset = -5;

export const TIMEZONE = 'America/New_York';

export const BLOCKED_TIME_SLOTS = [
    {
        startDay: 4,
        startHour: 20,
        startMinute: 15,
        endDay: 5,
        endHour: 1,
        endMinute: 0,
    },
    {
        startDay: 0,
        startHour: 13,
        startMinute: 0,
        endDay: 0,
        endHour: 19,
        endMinute: 30,
    },
    {
        startDay: 0,
        startHour: 20,
        startMinute: 15,
        endDay: 1,
        endHour: 1,
        endMinute: 0,
    },
    {
        startDay: 1,
        startHour: 20,
        startMinute: 10,
        endDay: 2,
        endHour: 1,
        endMinute: 0,
    },
];

export const FP_IGNORED_SLOT = {
    startDay: 2,
    startHour: 5,
    startMinute: 30,
    endDay: 4,
    endHour: 5,
    endMinute: 0,
};

export const LOBBY_SPREAD_LIMIT = 6.5;

export const LOBBY_SPREAD_LOWER_LIMIT = 0.65;
export const LOBBY_SPREAD_UPPER_LIMIT = 1.6;

export const PLAYER_POSITIONS = ['QB', 'RB', 'WR', 'TE'];
export const TOP_PLAYER_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

export const TOP_PLAYERS = [
    { name: 'Christian Mccaffrey', remoteId: 18877 },
    { name: 'Dalvin Cook', remoteId: 18872 },
    { name: 'Derrick Henry', remoteId: 17959 },
    { name: 'Davante Adams', remoteId: 16470 },
    { name: 'Ezekiel Elliott', remoteId: 17923 },
    { name: 'Tyreek Hill', remoteId: 18082 },
    { name: 'Patrick Mahomes', remoteId: 18890 },
    { name: 'Josh Allen', remoteId: 19801 },
    { name: 'Kyler Murray', remoteId: 20889 },
];


