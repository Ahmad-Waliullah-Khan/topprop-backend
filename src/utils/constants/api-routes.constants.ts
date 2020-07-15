export enum API_VERSIONS {
    V1 = 'v1',
    V2 = 'v2',
}
export const BASE_API_PATH = '/api';

export const API_RESOURCES = {
    CONTACT_SUBMISSIONS: 'contact-submissions',
    CONTESTS: 'contests',
    USERS: 'users',
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
        COUNT: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.CONTESTS}/count`,
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
        FIXES_UPDATES: {
            FIX_PERMISSIONS: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/fixes-updates/permissions`,
            FIX_ROLES: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/fixes-updates/roles`,
        },
        WALLET: {
            FETCH_WALLET_INFO: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet`,
            CREATE_PAYMENT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods`,
            DEFAULT_PAYMENT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods/{paymentMethod}/default`,
            DETACH_PAYMENT_METHOD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/payment-methods/{paymentMethod}/detach`,
            FUNDS: {
                ADD: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.USERS}/{id}/wallet/funds/add`,
            },
        },
    },
    // STRIPE_WEBHOOKS: {
    //     INVOICES: {
    //         PAYMENT_SUCCEEDED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/invoices/payment-succeeded`,
    //         PAYMENT_FAILED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/invoices/payment-failed`,
    //     },
    //     SUBSCRIPTIONS: {
    //         SUBSCRIPTION_CANCELED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/subscriptions/cancellation`,
    //         SUBSCRIPTION_UPDATED: `${BASE_API_PATH}/${API_VERSIONS.V1}/${API_RESOURCES.STRIPE_WEBHOOKS}/subscriptions/updated`,
    //     },
    // },
};
