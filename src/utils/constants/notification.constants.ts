export enum EMAIL_TEMPLATES {
    //* ADMIN EMAIL TEMPLATES
    ADMIN_CONTACT_FORM_SUBMITTED = 'admin-contact-form-submitted',
    // ADMIN_SUBSCRIPTION_CANCELLATION_REQUEST = 'admin-subscription-cancellation-request',
    // ADMIN_SUBSCRIPTION_CANCELED = 'admin-subscription-canceled',
    // ADMIN_PAYMENT_FAILED = 'admin-payment-failed',
    ADMIN_IMPORT_PLAYERS_UPDATE = 'admin-import-players-update',
    //* END ADMIN EMAIL TEMPLATES
    WELCOME = 'welcome',
    // ACCOUNT_CONFIRMED = 'account-confirmed',
    FORGOT_PASSWORD = 'forgot-password',
    NEW_PASSWORD_SET = 'new-password-set',
    CONTACT_SUBMISSION_REPLIED = 'contact-submission-replied',
    // RESEND_CONFIRM_TOKEN = 'resend-confirm-token',
    // SERVICE_SCHEDULED_ATTEMPT_FAILED = 'service-scheduled-attempt-failed',
    // SERVICE_SCHEDULED_UPDATED = 'service-scheduled-updated',
    // SERVICE_SCHEDULED_CANCELED = 'service-scheduled-canceled',
    // SERVICE_SCHEDULED_SUCCESSFULLY = 'service-scheduled-successfully',
    // SUBSCRIPTION_CREATED = 'subscription-created',
    // SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription-payment-succeeded',
    // SUBSCRIPTION_CANCELED = 'subscription-canceled',
    // SUBSCRIPTION_PAYMENT_FAILED = 'subscription-payment-failed',
    // SUBSCRIPTION_RE_ACTIVATED = 'subscription-re-activated',
    // DRIVER_INVITATION = 'driver-invitation',

    VERIFICATION_FILE_FAILED = 'verification-file-failed',
    VERIFICATION_FILE_DONE = 'verification-file-done',
    VERIFICATION_FILE_PENDING = 'verification-file-pending',
    PAYOUT_FAILED = 'payout-failed',
    PAYOUT_PAID = 'payout-paid',
    WITHDRAW_REQUEST_ACCEPTED = 'withdraw-request-accepted',
    WITHDRAW_REQUEST_DENIED = 'withdraw-request-denied',
    
    CONTEST_CREATED = 'create-contest',
    CONTEST_CLAIMED = 'claim-contest',
    CONTEST_CLAIMED_BY_CLAIMER = 'claim-contest-creator',
    CONTEST_WON = 'contest-win',
    CONTEST_LOST = 'contest-lose',
    CONTEST_DRAW_FAVORITE = 'contest-draw-favorite',
    CONTEST_DRAW_UNDERDOG = 'contest-draw-underdog',
    CONTEST_CLOSED = 'contest-close',

    USER_EMAIL = 'user-email',
    LEAGUE_INVITE = 'league-invite',

    LEAGUE_CONTEST_CREATED = 'league-create-contest',
    LEAGUE_CONTEST_CLAIMED = 'league-claim-contest',
    LEAGUE_CONTEST_CLAIMED_BY_CLAIMER = 'league-claim-contest-creator',
    LEAGUE_CONTEST_WON = 'league-contest-win',
    LEAGUE_CONTEST_LOST = 'league-contest-lose',
    LEAGUE_CONTEST_DRAW_FAVORITE = 'cleague-ontest-draw-favorite',
    LEAGUE_CONTEST_DRAW_UNDERDOG = 'league-contest-draw-underdog',
    LEAGUE_CONTEST_CLOSED = 'league-contest-close',
    
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
