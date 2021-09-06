export enum EMAIL_TEMPLATES {
    //* ADMIN EMAIL TEMPLATES
    ADMIN_CONTACT_FORM_SUBMITTED = 'admin-contact-form-submitted',
    ADMIN_IMPORT_PLAYERS_UPDATE = 'admin-import-players-update',
    ADMIN_SYNC_FAILED = 'admin-sync-failed',
    ADMIN_SYNC_FAILED_PLAYER_NOT_FOUND = 'admin-sync-failed-player-not-found',
    //* END ADMIN EMAIL TEMPLATES
    WELCOME = 'welcome',
    FORGOT_PASSWORD = 'forgot-password',
    NEW_PASSWORD_SET = 'new-password-set',
    CONTACT_SUBMISSION_REPLIED = 'contact-submission-replied',

    // VERIFICATION_FILE_FAILED = 'verification-file-failed',
    // VERIFICATION_FILE_DONE = 'verification-file-done',
    // VERIFICATION_FILE_PENDING = 'verification-file-pending',
    // PAYOUT_FAILED = 'payout-failed',
    // PAYOUT_PAID = 'payout-paid',
    WITHDRAW_REQUEST_ACCEPTED = 'withdraw-request-accepted',
    WITHDRAW_REQUEST_CREATED = 'withdraw-request-created',
    // WITHDRAW_REQUEST_DENIED = 'withdraw-request-denied',

    CONTEST_CREATED = 'create-contest',
    CONTEST_CLAIMED = 'claim-contest',
    CONTEST_CLAIMED_BY_CLAIMER = 'claim-contest-creator',
    CONTEST_WON = 'contest-win',
    CONTEST_LOST = 'contest-lose',
    CONTEST_DRAW_FAVORITE = 'contest-draw-favorite',
    CONTEST_DRAW_UNDERDOG = 'contest-draw-underdog',
    CONTEST_CLOSED = 'contest-close',

    FAILED_TRANSACTION = 'failed-transaction',

    USER_EMAIL = 'user-email',
    LEAGUE_INVITE = 'league-invite',
    LEAGUE_IMPORT = 'league-import',
    LEAGUE_PLAYER_NOT_FOUND = 'league-player-not-found',

    LEAGUE_CONTEST_CREATED = 'league-create-contest',
    LEAGUE_CONTEST_CLAIMED = 'league-claim-contest',
    LEAGUE_CONTEST_CLAIMED_BY_CLAIMER = 'league-claim-contest-creator',
    LEAGUE_CONTEST_WON = 'league-contest-win',
    LEAGUE_CONTEST_LOST = 'league-contest-lose',
    LEAGUE_CONTEST_DRAW_FAVORITE = 'league-contest-draw-favorite',
    LEAGUE_CONTEST_DRAW_UNDERDOG = 'league-contest-draw-underdog',
    LEAGUE_CONTEST_CLOSED = 'league-contest-close',

    //DWOLLA
    WALLET_CREATED = 'wallet-created',
    VERIFICATION_UPDATED = 'verification-updated',
    FUNDING_SOURCE_VERIFICATION_UPDATED = 'funding-source-verification-updated',
    FUNDS_ADDED = 'funds-added',
    BANK_TO_WALLET_TRANSFER_UPDATED = 'bank-to-wallet-transfer-updated',
    WALLET_TO_BANK_TRANSFER_UPDATED = 'wallet-to-bank-transfer-updated',
}

export enum NOTIFICATION_TYPES {
    EMAIL = 'email',
}
