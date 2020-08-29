export enum API_VERSIONS {
    V1 = 'v1',
    V2 = 'v2',
}
export const BASE_API_PATH = '/api';

export const API_RESOURCES = {
    BETS: 'bets',
    CONTACT_SUBMISSIONS: 'contact-submissions',
    CONTESTS: 'contests',
    GAINS: 'gains',
    GAMES: 'games',
    USERS: 'users',
    PLAYERS: 'players',
    STRIPE_WEBHOOKS: 'stripe-webhooks',
    TEAMS: 'teams',
    TOP_UPS: 'top-ups',
};

export const API_ENDPOINTS = {
    CONTACT_SUBMISSIONS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTACT_SUBMISSIONS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTACT_SUBMISSIONS}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTACT_SUBMISSIONS}/count`,
        REPLY: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTACT_SUBMISSIONS}/{id}/reply`,
        READ: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTACT_SUBMISSIONS}/{id}/read`,
        UNREAD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTACT_SUBMISSIONS}/{id}/unread`,
        USER: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTACT_SUBMISSIONS}/{id}/user`,
    },
    CONTESTS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/{id}`,
        CREATOR: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/{id}/creator`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/count`,
        CONTENDERS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/{id}/contenders`,
        },
    },
    GAMES: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/count`,
        TEAMS: {
            VISITOR: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/{id}/visitor-team`,
            HOME: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/{id}/home-team`,
        },
    },
    USERS: {
        CONTACT_SUBMISSIONS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contact-submissions`,
            BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contact-submissions/{contactSubmissionId}`,
        },
        SIGNUP: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/sign-up`,
        LOGIN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/login`,
        ADMIN_LOGIN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/admin-login`,
        FACEBOOK_LOGIN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/facebook-login`,
        GOOGLE_LOGIN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/google-login`,
        PURGE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/purge`,
        SET_ADDRESS: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/set-address`,
        SET_FORGOT_PASSWORD_TOKEN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/forgot-password`,
        RESET_PASSWORD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/reset-password`,
        CHANGE_PASSWORD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/change-password`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/count`,
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}`,
        USERNAME_VALIDATE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/username/validate`,
        USERNAME_GENERATE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/username/generate`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}`,
        ARCHIVE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/archive`,
        ACCEPT_TOS: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/accept-tos`,
        RENEW_TOKEN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/renew-token`,
        RESEND_CONFIRM_TOKEN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/resend-confirm-token`,
        CONFIRM_ACCOUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/confirm-account`,
        CONTESTS: {
            OWN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contests/own`,
            IAM_CONTENDER: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contests/iam-contender`,
        },
        CONTENDER: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contender`,
        },
        FIXES_UPDATES: {
            FIX_PERMISSIONS: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/fixes-updates/permissions`,
            FIX_ROLES: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/fixes-updates/roles`,
        },
        TOP_UPS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/top-ups`,
            BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/top-ups/{topUpId}`,
        },
        BETS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/bets`,
            BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/bets/{betId}`,
        },
        GAINS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/gains`,
            BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/gains/{gainId}`,
        },
        WALLET: {
            FETCH_WALLET_INFO: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet`,
            PAYMENT_METHODS: {
                CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods`,
                DEFAULT_PAYMENT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods/{paymentMethod}/default`,
                DETACH_PAYMENT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods/{paymentMethod}/detach`,
            },
            FUNDS: {
                ADD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/funds/add`,
                RETRIEVE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/funds/retrieve`,
                CALCULATE_NET_AMOUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/funds/calculate-net-amount`,
            },
        },
    },
    PLAYERS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/count`,
        TEAM: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/{id}/team`,
    },
    STRIPE_WEBHOOKS: {
        PAYMENTS: {
            REFUNDED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/payments/refunded`,
        },
    },
    TEAMS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TEAMS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TEAMS}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TEAMS}/count`,
        PLAYERS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TEAMS}/{id}/players`,
            BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TEAMS}/{id}/players/{playerId}`,
        },
    },
    TOP_UPS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TOP_UPS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TOP_UPS}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TOP_UPS}/count`,
        USER: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.TOP_UPS}/{id}/user`,
    },
};
