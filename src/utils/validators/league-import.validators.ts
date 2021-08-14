export const FETCH_LEAGUE_VALIDATOR = {
    code: {
        required: true,
        type: String,
        message: {
            required: 'Code is required.',
            type: 'Code must be string.',
        },
    },
    source: {
        required: true,
        type: String,
        message: {
            required: 'Source is required.',
            type: 'Source must be string.',
        },
    },
    leagueId: {
        required: true,
        type: Number,
        message: {
            required: 'League Id is required.',
            type: 'League Id must be a numeric value.',
        },
    },
    espnS2: {
        required: true,
        type: String,
        message: {
            required: 'EspnS2 Key is required.',
            type: 'EspnS2 Key must be a string.',
        },
    },
    swid: {
        required: true,
        type: String,
        message: {
            required: 'Swid Key is required.',
            type: 'Swid Key must be a string.',
        },
    },
    leagueKey: {
        required: true,
        type: String,
        message: {
            required: 'League Key is required.',
            type: 'League Key must be string.',
        },
    },
};

export const IMPORT_LEAGUE_VALIDATOR = {
    code: {
        required: true,
        type: String,
        message: {
            required: 'Code is required.',
            type: 'Code must be string.',
        },
    },
    leagueId: {
        required: true,
        type: Number,
        message: {
            required: 'League Id is required.',
            type: 'League Id must be a numeric value.',
        },
    },
    espnleagueId: {
        required: true,
        type: String,
        message: {
            required: 'League Id is required.',
            type: 'League Id must be a string value.',
        },
    },
    espnS2: {
        required: true,
        type: String,
        message: {
            required: 'EspnS2 Key is required.',
            type: 'EspnS2 Key must be a string.',
        },
    },
    swid: {
        required: true,
        type: String,
        message: {
            required: 'Swid Key is required.',
            type: 'Swid Key must be a string.',
        },
    },
    leagueKey: {
        required: true,
        type: String,
        message: {
            required: 'League Key is required.',
            type: 'League Key must be string.',
        },
    },
    accessToken: {
        required: true,
        type: String,
        message: {
            required: 'Access Token is required.',
            type: 'Access Token must be string.',
        },
    },
    refreshToken: {
        required: true,
        type: String,
        message: {
            required: 'Refresh Token is required.',
            type: 'Refresh Token must be string.',
        },
    },
    scoringTypeId: {
        required: true,
        type: Number,
        message: {
            required: 'Scoring Type is required.',
            type: 'Scoring Type must be string.',
        },
    },
    importSourceId: {
        required: true,
        type: Number,
        message: {
            required: 'Import Source Id is required.',
            type: 'Import Source Id be numeric.',
        },
    },
};
