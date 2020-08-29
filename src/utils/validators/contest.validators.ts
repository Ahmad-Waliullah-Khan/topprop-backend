import { values } from 'lodash';
import { CONTEST_SCORING_OPTIONS, CONTEST_STATUSES } from '../constants';

export const CONTEST_VALIDATORS = {
    id: {
        required: true,
        type: Number,
        message: {
            required: 'Contest id is required.',
            type: 'Contest id must be a number.',
        },
    },
    playerId: {
        required: true,
        type: Number,
        message: {
            required: 'Player id is required.',
            type: 'Player id must be a number.',
        },
    },
    creatorId: {
        required: true,
        type: Number,
        message: {
            required: 'Creator id is required.',
            type: 'Creator id must be a number.',
        },
    },
    gameId: {
        required: true,
        type: Number,
        message: {
            required: 'Game id is required.',
            type: 'Game id must be a number.',
        },
    },
    fantasyPoints: {
        type: Number,
        required: true,
        length: { min: 0 },
        message: {
            required: 'Fantasy points is required.',
            type: 'Fantasy points must be a number.',
            length: 'Fantasy points must be greater or equal to zero.',
        },
    },
    scoring: {
        type: String,
        required: true,
        enum: values(CONTEST_SCORING_OPTIONS),

        message: {
            required: 'Scoring is required.',
            type: 'Scoring must be a string.',
            enum: `Scoring must be one of these options: ${values(CONTEST_SCORING_OPTIONS).join(', ')}.`,
        },
    },
    status: {
        type: String,
        required: true,
        enum: values(CONTEST_STATUSES),

        message: {
            required: 'Status is required.',
            type: 'Status must be a string.',
            enum: `Status must be one of these options: ${values(CONTEST_STATUSES).join(', ')}.`,
        },
    },
};
