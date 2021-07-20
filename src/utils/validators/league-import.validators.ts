export const FETCH_LEAGUE_VALIDATOR = {
  code: {
    required: true,
    type: String,
    message: {
        required: 'Code is required.',
        type: 'Code must be string.',
    },
  },
  name: {
    required: true,
    type: String,
    message: {
        required: 'Name is required.',
        type: 'Name must be string.',
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
  scoringType: {
    required: true,
    type: String,
    message: {
        required: 'Scoring Type Key is required.',
        type: 'Scoring Type must be string.',
    },
  },
  teamIds: {
    required: true,
    type: Array,
    message: {
        required: 'Team Ids Key is required.',
        type: 'Team Ids must be an Array of Ids.',
    },
  },
  scoringTypeId: {
    required: true,
    type: Number,
    message: {
        required: 'Scoring Type Id Key is required.',
        type: 'Scoring Type Id must be a number.',
    },
  },
  accessToken: {
    required: true,
    type: String,
    message: {
        required: 'Access Token Key is required.',
        type: 'Access Token must be a string.',
    },
  },
  refreshToken: {
    required: true,
    type: String,
    message: {
        required: 'Refresh Token Key is required.',
        type: 'Refresh Token must be a string.',
    },
  },
};
