export const INVITE_VALIDATOR = {
    token: {
        required: true,
        type: String,
        message: {
            required: 'Token is required.',
            type: 'Token must be string.',
        },
    },
    inviteId: {
        required: true,
        type: Number,
        message: {
            required: 'Invite Id is required.',
            type: 'Invite Id must be number.',
        },
    },
};
