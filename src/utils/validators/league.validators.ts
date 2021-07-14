export const FETCH_LEAGUE_VALIDATORS = {

    importSource: {
        required: true,
        type: String,
        message: {
            required: 'Import Source is required',
            type: 'Import Source must be a string.',
        },
    },
};
