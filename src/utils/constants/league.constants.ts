export enum LEAGUE_SOURCE_TYPE {
    ESPN = 'espn',
    YAHOO = 'yahoo',
}

export enum SPREAD_TYPE {
    LOBBY = 'lobby',
    LEAGUE_1_TO_2 = 'league_1_to_2',
    LEAGUE_3_TO_6 = 'league_3_to_6',
    LEAGUE_7_TO_18 = 'league_7_to_18',
}

export const ESPN_LINEUP_SLOT_MAPPING: { [key: number]: string } = {
    0: 'QB',
    2: 'RB',
    4: 'WR',
    16: 'DEF',
    17: 'K',
    23: 'FLEX',
};

export const ESPN_POSITION_MAPPING: { [key: number]: string } = {
    3: 'WR',
    2: 'RB',
    1: 'QB',
    16: 'DEF',
    5: 'K',
    23: 'FLEX',
};
