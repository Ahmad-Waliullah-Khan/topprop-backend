export const FETCH_LEAGUE_VALIDATOR = {
  source: {
      required: true,
      type: String,
      message: {
          required: 'Source is required.',
          type: 'Source must be string.',
      },
  },
};
