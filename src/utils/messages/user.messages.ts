import { MINIMUM_WITHDRAW_AMOUNT } from '../constants';

export const USER_MESSAGES = {
    INVALID_CREDENTIALS: `The credentials are incorrect. Try again.`,
    INVALID_CREDENTIALS_TIMEOUT: `The credentials are incorrect.Please try again after`,
    ACCOUNT_TIMEOUT: `Your account has been temporarily blocked.Please try again after`,
    EMPTY_CREDENTIALS: `Must provide credentials.`,
    USER_NOT_FOUND: `User does not exist.`,
    USER_ALREADY_CONFIRMED: `User already confirmed.`,
    EMAIL_ALREADY_USED: `The email is already used.`,
    USERNAME_ALREADY_USED: `The username is already used.`,
    INVALID_CONFIRMATION_TOKEN: `Invalid confirmation token.`,
    FORGOT_EMAIL_ALREADY_SENT: `Please check your email to reset your password.`,
    RESET_PASS_TOKEN_EXPIRED: `Your reset password token has expired. Generate a new one and try again.`,
    LOGGED_IN_WITH_SOCIAL_NETWORK: `You have logged in with a social network.`,
    EMIL_SENT: `Email has been sent successfully.`,
    STATE_INVALID: `is not one of our supported states yet. Please check back later.`,
    STATE_NOT_DETECTED: `Your state could not be detected. We apologise for any inconvenience caused`,
    COUNTRY_INVALID: `is not one of our supported countries yet. Please check back later.`,
    CONUTRY_NOT_DETECTED: `Your country could not be detected. We apologise for any inconvenience caused`,
    AGE_RESTRICTED: (age: number, state: string) =>
        `You are not old enough to use this app. You need to be ${age} to use TopProp in ${state}`,
    AGE_RESTRICTED_ROW: (age: number) =>
        `You are not old enough to use this app. You need to be ${age} to use TopProp`,
};
export const WALLET_MESSAGES = {
    MISSING_WALLET: `User does not a wallet yet.`,
    PAYMENT_METHOD_ALREADY_DEFAULT: `Payment method provided is already the default.`,
    DEFAULT_PAYMENT_METHOD_DETACH_ERROR: `The default payment method cannot be detached. Add a new payment method and select it as default to detach this one.`,
    INVALID_PAYMENT_METHOD: `The payment method provided is is not attached to the user.`,
    WALLET_ALREADY_CREATED: `The wallet was already created.`,
    INVALID_WALLET: `Invalid Wallet create one first.`,
    NO_PAYOUT_METHODS: `There are no payout methods attached to the user. Create one first.`,
    INVALID_VERIFICATION_FILE_TYPE: `Invalid verification file type, must provide an image (PNG,JPEG).`,
    INVALID_VERIFICATION_FILE_SIDE: `Invalid verification file side, must be front or back.`,
    INVALID_VERIFICATION_FILE: `Must provide a verification file.`,
    VERIFICATION_FILE_SIDE_ALREADY_PROVIDED: (side: string) =>
        `The ${side} side verification file provided is already verified`,
    ALREADY_VERIFIED: `The account is already verified.`,
    OPEN_WITHDRAW_REQUEST: `You have a pending withdraw request. Please wait till the request is processed before deleting the funding source.`,
    WEEKLY_DEPOSIT_LIMIT: (balance: number) =>
        `This transaction will add more than your state's monthly deposit limit. You can deposit a maximum of $${
            balance / 100
        } till the end of the month`,
};
export const WITHDRAW_REQUEST_MESSAGES = {
    WITHDRAW_REQUEST_NOT_FOUND: `Withdraw request not found.`,
    LIMIT_EXCEEDED: `You already have a pending request. Please wait for our response or send us a message via the support page.`,
    INVALID_WITHDRAW_AMOUNT: (currentAmount: number): string =>
        `The minimum amount to request a withdraw is $${(MINIMUM_WITHDRAW_AMOUNT / 100).toFixed(
            2,
        )} after fees. Current amount after fees: $${(currentAmount / 100).toFixed(2)}`,
    INVALID_WITHDRAW_STATUS: (status: string) =>
        `The withdraw request must be pending to proceed, the actual status is: ${status}.`,
};
