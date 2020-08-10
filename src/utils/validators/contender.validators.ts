import { values } from 'lodash';
import { CONTEST_TYPES } from '../constants';

export const CONTENDER_VALIDATORS = {
    id: {
        required: true,
        type: Number,
        message: {
            required: 'Contest id is required.',
            type: 'Contest id must be a number.',
        },
    },
    contestId: {
        required: true,
        type: Number,
        message: {
            required: 'Contest id is required.',
            type: 'Contest id must be a number.',
        },
    },
    contenderId: {
        required: true,
        type: Number,
        message: {
            required: 'Contender id is required.',
            type: 'Contender id must be a number.',
        },
    },

    type: {
        type: String,
        required: true,
        enum: values(CONTEST_TYPES),

        message: {
            required: 'Type is required.',
            type: 'Type must be a string.',
            enum: `Type must be one of these options: ${values(CONTEST_TYPES).join(', ')}.`,
        },
    },
};
