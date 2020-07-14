export const CONTACT_SUBMISSION_VALIDATORS = {
    id: {
        required: true,
        type: Number,
        message: {
            required: 'Contact Submission id is required.',
            type: 'Contact Submission id must be a number.',
        },
    },
    userId: {
        required: true,
        type: Number,
        message: {
            required: 'User id is required.',
            type: 'User id must be a number.',
        },
    },
    message: {
        type: String,
        required: true,
        length: { min: 20, max: 620 },
        message: {
            required: 'Message is required.',
            length: 'Message must contain between 20 and 620 characters.',
        },
    },
    reply: {
        type: String,
        required: true,
        length: { min: 20, max: 620 },
        message: {
            required: 'Reply is required.',
            length: 'Reply must contain between 20 and 620 characters.',
        },
    },
};
