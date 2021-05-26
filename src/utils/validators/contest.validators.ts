import { values } from 'lodash';
import { CONTEST_SCORING_OPTIONS, CONTEST_STATUSES } from '../constants';

export const CONTEST_CREATE_VALIDATORS = {
    creatorId: {
        required: true,
        type: Number,
        message: {
            required: 'Creator id is required.',
            type: 'Creator id must be a number.',
        },
    },
    creatorPlayerId: {
        required: true,
        type: Number,
        message: {
            required: 'Creator Player id is required.',
            type: 'Creator Player id must be a number.',
        },
    },
    claimerPlayerId: {
        required: true,
        type: Number,
        message: {
            required: 'Claimer Player id is required.',
            type: 'Claimer Player id must be a number.',
        },
    },
    entryAmount: {
        required: true,
        type: Number,
        message: {
            required: 'Entry is required.',
            type: 'Entry must be a number.',
        },
    },
    winBonus: {
        required: true,
        type: Boolean,
        message: {
            required: 'Win Bonus is required.',
            type: 'Win Bonus must be a boolean.',
        },
    },
};

export const CONTEST_CLAIM_VALIDATOR = {
    contestId: {
        required: true,
        type: Number,
        message: {
            required: 'Contest id is required.',
            type: 'Contest id must be a number.',
        },
    },
    claimerId: {
        required: true,
        type: Number,
        message: {
            required: 'Claimer id is required.',
            type: 'Claimer id must be a number.',
        },
    },
};
