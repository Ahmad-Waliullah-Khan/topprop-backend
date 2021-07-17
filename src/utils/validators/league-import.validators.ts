export const FETCH_LEAGUE_VALIDATOR = {
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

