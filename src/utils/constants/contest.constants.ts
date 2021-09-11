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
