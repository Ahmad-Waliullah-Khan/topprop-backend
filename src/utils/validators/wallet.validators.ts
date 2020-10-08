import { MINIMUM_BET_AMOUNT } from '../constants';
import { US_STATES_ABBREVIATIONS } from '../constants/wallet.constants';
import { ValidatorHelpers } from '../helpers';

export const WALLET_VALIDATORS = {
    /*************** Stripe validators ******************/
    // _stripeAccountToken: {
    //     type: String,
    //     required: true,
    //     message: {
    //         required: 'Stripe Account Token is a required param (_stripeAccountToken).',
    //     },
    // },
    // _stripeCustomerToken: {
    //     type: String,
    //     required: true,
    //     message: {
    //         required: 'Stripe Customer Token is a required param (_stripeCustomerToken).',
    //     },
    // },
    // payoutType: {
    //     type: String,
    //     required: true,
    //     enum: values(STRIPE_EXTERNAL_ACCOUNT_TYPES),
    //     message: {
    //         required: 'Payout type is a required param (payoutType).',
    //         enum: `Payout type must be one of these options: ${values(STRIPE_EXTERNAL_ACCOUNT_TYPES).join(', ')}.`,
    //     },
    // },
    // payoutToken: {
    //     type: String,
    //     required: true,
    //     message: {
    //         required: 'Payout Token is a required param (payoutToken).',
    //     },
    // },
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
            size: `The minimum amount is 10 USD.`,
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
        type: Number,
        required: true,
        // size: { min: 1, max: 31 },
        message: {
            required: `Id Number is required.`,
            type: `Id Number must be a number`,
        },
    },
};
