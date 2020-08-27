import { MINIMUM_BET_AMOUNT } from '../constants';

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
};
