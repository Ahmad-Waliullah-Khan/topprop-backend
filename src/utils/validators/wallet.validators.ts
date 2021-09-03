import { MINIMUM_BET_AMOUNT } from '../constants';
import { US_STATES_ABBREVIATIONS } from '../constants/wallet.constants';
import { ValidatorHelpers } from '../helpers';

export const WALLET_VALIDATORS = {
    payoutMethodToken: {
        type: String,
        required: true,
        message: {
            required: 'Payout method token is a required param (payoutMethodToken).',
        },
    },
    paymentMethodToken: {
        type: String,
        required: true,
        message: {
            required: 'Payment method token is a required param (paymentMethodToken).',
        },
    },

    // ONLY TO THE ADD FUNDS API
    paymentMethod: {
        type: String,
        message: {
            TYPE: 'Payment method must be a string.',
        },
    },
    amount: {
        type: Number,
        required: true,
        size: { min: MINIMUM_BET_AMOUNT },
        message: {
            type: 'Amount must be a number.',
            required: 'Amount is required.',
        },
    },

    address: {
        city: {
            type: String,
            required: true,
            message: {
                required: `Address. City is required.`,
                type: `Address. City must be a string.`,
            },
        },
        country: {
            type: String,
            required: true,
            message: {
                required: `Address. Country is required.`,
                type: `Address. Country must be a string.`,
            },
        },
        line1: {
            type: String,
            required: true,
            message: {
                required: `Address. Line 1 is required.`,
                type: `Address. Line 1 must be a string.`,
            },
        },
        line2: {
            type: String,
            message: {
                type: `Address. Line 2 must be a string.`,
            },
        },
        postal_code: {
            required: true,
            match: /^\d{5}$/,
            message: {
                required: `Address. Postal code is required.`,
                type: `Address. Postal code must be a string.`,
                match: `Address. Postal code must be have only 5 digits.`,
            },
        },
        state: {
            type: String,
            required: true,
            use: { validWalletState: ValidatorHelpers.validWalletState },
            message: {
                required: `Address. State is required.`,
                type: `Address. State must be a string.`,
                validWalletState: `Address. State must be one of these values: ${US_STATES_ABBREVIATIONS.map(
                    state => state.value,
                ).join(', ')}.`,
            },
        },
    },
    dob: {
        day: {
            type: Number,
            required: true,
            size: { min: 1, max: 31 },
            message: {
                required: `Date of Birthday. Day is required.`,
                type: `Date of Birthday. Day must be a number.`,
                size: `Date of Birthday. Day must be between 1 and 31.`,
            },
        },
        month: {
            type: Number,
            required: true,
            size: { min: 1, max: 12 },
            message: {
                required: `Date of Birthday. Month is required.`,
                type: `Date of Birthday. Month must be a number.`,
                size: `Date of Birthday. Month must be between 1 and 12.`,
            },
        },
        year: {
            type: Number,
            required: true,
            // size: { min: 1, max: 31 },
            message: {
                required: `Date of Birthday. Year is required.`,
                type: `Date of Birthday. Year must be a number.`,
                // size: `Date of Birthday. Year must be between 1 and 31.`,
            },
        },
    },
    firstName: {
        type: String,
        required: true,
        message: {
            required: `First name is required.`,
            type: `First name must be a string.`,
        },
    },
    lastName: {
        type: String,
        required: true,
        message: {
            required: `Last name is required.`,
            type: `Last name must be a string.`,
        },
    },
    idNumber: {
        type: String,
        required: true,
        match: /^\d+$/,
        message: {
            required: `Id Number is required.`,
            match: `Id Number must be a number`,
        },
    },
    sourceFundingSourceId: {
        type: String,
        required: true,
        // match: /^\d+$/,
        message: {
            required: `Source Funding Source is required.`,
            // match: `Id Number must be a number`,
        },
    },
};

export const WITHDRAW_REQUEST_VALIDATORS = {
    amount: {
        type: String,
        required: true,
        // size: { min: MINIMUM_BET_AMOUNT },
        use: { isNumber: ValidatorHelpers.isNumber, greaterOrEqualThan: ValidatorHelpers.greaterOrEqualThan(10) },

        message: {
            type: 'Amount must be a string.',
            required: 'Amount is required.',
            isNumber: `The minimum amount is 10 USD.`,
            greaterOrEqualThan: `The minimum amount is 10 USD.`,
        },
    },
    destinationFundingSourceId: {
        type: String,
        required: true,
        // match: /^\d+$/,
        message: {
            required: `Destination Funding Source is required.`,
            // match: `Id Number must be a number`,
        },
    },
};
