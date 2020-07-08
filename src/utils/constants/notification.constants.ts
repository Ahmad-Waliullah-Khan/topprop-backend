export enum EMAIL_TEMPLATES {
    //* ADMIN EMAIL TEMPLATES
    ADMIN_CONTACT_FORM_SUBMITTED = 'admin-contact-form-submitted',
    ADMIN_SUBSCRIPTION_CANCELLATION_REQUEST = 'admin-subscription-cancellation-request',
    ADMIN_SUBSCRIPTION_CANCELED = 'admin-subscription-canceled',
    ADMIN_PAYMENT_FAILED = 'admin-payment-failed',
    //* END ADMIN EMAIL TEMPLATES
    WELCOME = 'welcome',
    ACCOUNT_CONFIRMED = 'account-confirmed',
    FORGOT_PASSWORD = 'forgot-password',
    NEW_PASSWORD_SET = 'new-password-set',
    RESEND_CONFIRM_TOKEN = 'resend-confirm-token',
    SERVICE_SCHEDULED_ATTEMPT_FAILED = 'service-scheduled-attempt-failed',
    SERVICE_SCHEDULED_UPDATED = 'service-scheduled-updated',
    SERVICE_SCHEDULED_CANCELED = 'service-scheduled-canceled',
    SERVICE_SCHEDULED_SUCCESSFULLY = 'service-scheduled-successfully',
    SUBSCRIPTION_CREATED = 'subscription-created',
    SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription-payment-succeeded',
    SUBSCRIPTION_CANCELED = 'subscription-canceled',
    SUBSCRIPTION_PAYMENT_FAILED = 'subscription-payment-failed',
    SUBSCRIPTION_RE_ACTIVATED = 'subscription-re-activated',
    DRIVER_INVITATION = 'driver-invitation',
}

// export enum PUSH_NOTIFICATIONS {
//     TIRE_ROTATION_80_PERCENT_SUGGESTION = 'tire-rotation-80-percent-suggestion',
//     TIRE_ROTATION_90_PERCENT_SUGGESTION = 'tire-rotation-90-percent-suggestion',
//     TIRE_ROTATION_100_PERCENT_SUGGESTION = 'tire-rotation-100-percent-suggestion',
//     TIRE_REPLACEMENT_80_PERCENT_SUGGESTION = 'tire-replacement-80-percent-suggestion',
//     TIRE_REPLACEMENT_90_PERCENT_SUGGESTION = 'tire-replacement-90-percent-suggestion',
//     TIRE_REPLACEMENT_100_PERCENT_SUGGESTION = 'tire-replacement-100-percent-suggestion',
//     MILES_TRACKED_CONFIRMATION = 'miles-tracked-confirmation',
//     SERVICE_SCHEDULED_DAY_REMINDER = 'service-scheduled-day-reminder',
//     SERVICE_SCHEDULED_HOUR_REMINDER = 'service-scheduled-hour-reminder',
//     SERVICE_SCHEDULED_UPDATED = 'service-scheduled-updated',
//     SERVICE_SCHEDULED_CANCELED = 'service-scheduled-canceled',
//     SERVICE_SCHEDULED_ATTEMPT_FAILED = 'service-scheduled-attempt-failed',
//     SERVICE_SCHEDULED_COMPLETED = 'service-scheduled-completed',
//     DRIVER_INVITATION = 'driver-invitation',
// }

export enum NOTIFICATION_TYPES {
    PUSH = 'push',
    EMAIL = 'email',
}
