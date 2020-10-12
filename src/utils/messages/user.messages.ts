import { MINIMUM_WITHDRAW_AMOUNT } from '../constants';

export const USER_MESSAGES = {
    INVALID_CREDENTIALS: `The credentials are incorrect. Try again.`,
    EMPTY_CREDENTIALS: `Must provide credentials.`,
    USER_NOT_FOUND: `User does not exist.`,
    USER_ALREADY_CONFIRMED: `User already confirmed.`,
    EMAIL_ALREADY_USED: `The email is already used.`,
    USERNAME_ALREADY_USED: `The username is already used.`,
    INVALID_CONFIRMATION_TOKEN: `Invalid confirmation token.`,
    FORGOT_EMAIL_ALREADY_SENT: `Please check your email to reset your password.`,
    RESET_PASS_TOKEN_EXPIRED: `Your reset password token has expired. Generate a new one and try again.`,
    LOGGED_IN_WITH_SOCIAL_NETWORK: `You have logged in with a social network.`,
};
export const WALLET_MESSAGES = {
    MISSING_WALLET: `User does not a wallet yet. Add a card first.`,
    PAYMENT_METHOD_ALREADY_DEFAULT: `Payment method provided is already the default.`,
    DEFAULT_PAYMENT_METHOD_DETACH_ERROR: `The default payment method cannot be detached. Add a new payment method and select it as default to detach this one.`,
    INVALID_PAYMENT_METHOD: `The payment method provided is is not attached to the user.`,
    WALLET_ALREADY_CREATED: `The wallet was already created.`,
    INVALID_WALLET: `Invalid Wallet create one first.`,
    NO_PAYOUT_METHODS: `There are no payout methods attached to the user. Create one first.`,
    INVALID_VERIFICATION_FILE_TYPE: `Invalid verification file type, must provide an image (PNG,JPEG).`,
    INVALID_VERIFICATION_FILE_SIDE: `Invalid verification file side, must be front or back.`,
    INVALID_VERIFICATION_FILE: `Must provide a verification file.`,
    VERIFICATION_FILE_SIDE_ALREADY_PROVIDED: `Verification file for the provided side was already attached. Try the other side or wait until validation.`,
};
export const WITHDRAW_REQUEST_MESSAGES = {
    WITHDRAW_REQUEST_NOT_FOUND: `Withdraw request not found.`,
    LIMIT_EXCEEDED: `You have already a pending request. Please wait for our response or send us a message via the support page.`,
    INVALID_WITHDRAW_AMOUNT: `The minimum amount to request a withdraw is $${MINIMUM_WITHDRAW_AMOUNT / 100}.`,
    INVALID_WITHDRAW_STATUS: (status: string) =>
        `The withdraw request must be pending to proceed, the actual status is: ${status}.`,
};
