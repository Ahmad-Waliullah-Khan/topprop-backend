export const IMPORTED_PLAYER_VALIDATORS = {
    name: {
        type: String,
        required: true,
        message: {
            required: 'name is required.',
            type: `name must be a string`,
        },
    },
    points: (number: number) => ({
        type: Number,
        size: { min: 0, max: 1 },
        required: true,
        message: {
            required: `points${number} is required.`,
            type: `points${number} must be a number`,
            size: `points${number} must be a between 0 and 1`,
        },
    }),
    position: {
        type: String,
        required: true,
        message: {
            required: 'position is required.',
            type: 'position must be a string.',
        },
    },
    team: {
        type: String,
        required: true,
        message: {
            required: 'team is required.',
            type: 'team must be a string.',
        },
    },
    remoteTeamId: {
        type: Number,
        required: true,
        message: {
            required: 'remoteTeamId is required.',
            type: 'remoteTeamId must be a number.',
        },
    },
    remoteId: {
        type: Number,
        required: true,
        message: {
            required: 'remoteId is required.',
            type: 'remoteId must be a number.',
        },
    },
    photoUrl: {
        type: String,
        required: true,
        match: /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.%]+$/,
        message: {
            required: 'photoUrl is required.',
            type: 'photoUrl must be a string.',
            match: 'photoUrl must be a valid url.',
        },
    },
};
