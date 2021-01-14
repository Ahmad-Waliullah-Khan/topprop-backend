import { isEqual, values } from 'lodash';
import { CONTEST_TYPES } from '../constants';
import { ValidatorHelpers } from '../helpers';

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
    toRiskAmount: (amount: number, minAmount = 0) => ({
        required: true,
        type: Number,
        size: { min: minAmount },
        use: { lowerThanEqual: ValidatorHelpers.lowerOrEqualThan(amount) },
        message: {
            type: 'To risk amount must be a number.',
            required: 'To risk amount is required.',
            size: `The minimum amount is ${(minAmount / 100).toFixed(2)} USD.`,
            lowerThanEqual: isEqual(amount, 0)
                ? `You do not have enough funds. Please add some funds to your wallet and try again.`
                : `The maximum risk amount should be $${(amount / 100).toFixed(2)}`,
        },
    }),
    toWinAmount: (amount: number) => ({
        required: true,
        type: Number,
        use: { greaterOrEqualThan: ValidatorHelpers.greaterOrEqualThan(amount) },
        message: {
            type: 'To win amount must be a number.',
            required: 'To win amount is required.',
            greaterOrEqualThan: isEqual(amount, 0)
                ? `You must win any amount greater than zero`
                : `The minimum win amount should be $${amount / 100}`,
        },
    }),
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

    //* ONLY FOR THE CALCULATE TO WIN
    matching: {
        type: Boolean,
        required: true,
        message: {
            required: 'Matching is required.',
            type: 'Matching must be a true or false.',
        },
    },

    //* ONLY FOR THE CALCULATE TO RISK AMOUNT
    initialRiskAmount: {
        type: Number,
        required: true,
        message: {
            required: 'Initial Risk Amount is required.',
            type: 'Initial Risk Amount  must be a number.',
        },
    },
};
