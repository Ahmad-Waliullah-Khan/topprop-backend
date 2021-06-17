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
}

export enum TIMEFRAMES {
    CURRENT = 'current',
    UPCOMING = 'upcoming',
    COMPLETED = 'completed',
    RECENT = 'recent',
    ALL = 'all',
}
