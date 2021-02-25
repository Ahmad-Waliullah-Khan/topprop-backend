export enum API_VERSIONS {
    V1 = 'v1',
    V2 = 'v2',
}
export const BASE_API_PATH = '/api';

export const API_RESOURCES = {
    BETS: 'bets',
    CONTACT_SUBMISSIONS: 'contact-submissions',
    CONTESTS: 'contests',
    CONTENDERS: 'contenders',
    GAINS: 'gains',
    GAMES: 'games',
    LEAGUE_DETAILS: 'league-details',
    USERS: 'users',
    PLAYERS: 'players',
    STRIPE_WEBHOOKS: 'stripe-webhooks',
    TEAMS: 'teams',
    TOP_UPS: 'top-ups',
    WITHDRAW_REQUESTS: 'withdraw-requests',
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
    CONTENDERS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTENDERS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTENDERS}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTENDERS}/count`,
    },
    CONTESTS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/{id}`,
        CREATOR: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/{id}/creator`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/count`,
        CONTENDERS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/{id}/contenders`,
        },
        CALCULATE_TO_WIN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/calculate/to-win`,
        CALCULATE_TOTAL_TO_WIN: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/calculate/total-to-win`,
        CALCULATE_TOP_PROP_REVENUE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/calculate/top-prop-revenue`,
        CALCULATE_RISK_TO_MATCH: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/calculate/risk-to-match`,
    },
    GAMES: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}`,
        CURRENT_WEEK: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/current-week`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/count`,
        TEAMS: {
            VISITOR: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/{id}/visitor-team`,
            HOME: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.GAMES}/{id}/home-team`,
        },
    },
    LEAGUE_DETAILS: {
        NFL: {
            CURRENT_WEEK: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.LEAGUE_DETAILS}/nfl/current-week`,
            CURRENT_SEASON: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.LEAGUE_DETAILS}/nfl/current-season`,
            TIME_FRAMES: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.LEAGUE_DETAILS}/nfl/time-frames/{timeFrame}`,
            SCHEDULE_BY_SEASON: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.LEAGUE_DETAILS}/nfl/schedule/{season}`,
            SCHEDULE_BY_WEEK: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.LEAGUE_DETAILS}/nfl/schedule/{season}/{week}`,
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
            STATISTICS: {
                // LEAD_STATUS: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contests/stats/lead-status`,
                CONVERSION: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contests/stats/conversion`,
            },
        },
        CONTENDER: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contenders`,
            COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/contenders/count`,
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
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet`,
            VERIFICATION_FILE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/verification-file`,
            PAYMENT_METHODS: {
                CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods`,
                DEFAULT_PAYMENT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods/{paymentMethod}/default`,
                DETACH_PAYMENT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods/{paymentMethod}/detach`,
            },
            PAYOUT_METHODS: {
                CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payout-methods`,
                DEFAULT_PAYOUT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payout-methods/{payoutMethod}/default`,
                BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payout-methods/{payoutMethod}`,
            },
            FUNDS: {
                ADD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/funds/add`,
                RETRIEVE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/funds/retrieve`,
                CALCULATE_NET_AMOUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/funds/calculate-net-amount`,
            },
            PAYOUTS: {
                NET_AMOUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payouts/net-amount`,
            },
        },
        WITHDRAW_REQUESTS: {
            CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/withdraw-requests`,
        },
    },
    PLAYERS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/{id}`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/count`,
        TEAM: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/{id}/team`,
        IMPORT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/import`,
        GOOGLE_SHEETS_IMPORT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/google-sheets/import`,
        EXPORT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/export`,
        GET_REMOTE: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.PLAYERS}/remote`,
    },
    STRIPE_WEBHOOKS: {
        PAYMENTS: {
            REFUNDED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/payments/refunded`,
        },
        CONNECT_ACCOUNTS: {
            VERIFICATION_FILE_UPDATED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/connect-accounts/verification-file-updated`,
            PAYOUTS: {
                PAID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/connect-accounts/payouts/paid`,
                FAILED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/connect-accounts/payouts/failed`,
            },
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
    WITHDRAW_REQUESTS: {
        CRUD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.WITHDRAW_REQUESTS}`,
        BY_ID: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.WITHDRAW_REQUESTS}/{id}`,
        ACCEPT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.WITHDRAW_REQUESTS}/{id}/accept`,
        DENY: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.WITHDRAW_REQUESTS}/{id}/deny`,
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.WITHDRAW_REQUESTS}/count`,
        USER: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.WITHDRAW_REQUESTS}/{id}/user`,
    },
};
