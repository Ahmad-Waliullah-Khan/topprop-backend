export const PERMISSIONS = {
    CONTACT_SUBMISSIONS: {
        VIEW_ALL_CONTACT_SUBMISSIONS: 'viewAllContactSubmissions',
        VIEW_ANY_CONTACT_SUBMISSION: 'viewAnyContactSubmission',
        CREATE_ANY_CONTACT_SUBMISSION: 'createAnyContactSubmission',
        UN_READ_ANY_CONTACT_SUBMISSION: 'unReadAnyContactSubmission',
        REPLY_ANY_CONTACT_SUBMISSION: 'replyAnyContactSubmission',
        DELETE_ANY_CONTACT_SUBMISSION: 'deleteAnyContactSubmission',
        ARCHIVE_ANY_CONTACT_SUBMISSION: 'archiveAnyContactSubmission',
        COUNT_CONTACT_SUBMISSIONS: 'countContactSubmissions',
    },
    CONTESTS: {
        VIEW_ALL_CONTESTS: 'viewAllContests',
        VIEW_ANY_CONTEST: 'viewAnyContest',
        CREATE_ANY_CONTEST: 'createAnyContest',
        UPDATE_ANY_CONTEST: 'updateAnyContest',
        DELETE_ANY_CONTEST: 'deleteAnyContest',
        ARCHIVE_ANY_CONTEST: 'archiveAnyContest',
        COUNT_CONTESTS: 'countContests',
    },
    GAMES: {
        VIEW_ALL_GAMES: 'viewAllGames',
        VIEW_ANY_GAME: 'viewAnyGame',
        // CREATE_ANY_GAME: 'createAnyGame',
        // UPDATE_ANY_GAME: 'updateAn/yGame',
        // DELETE_ANY_GAME: 'deleteAnyGame',
        // ARCHIVE_ANY_GAME: 'archiveAnyGame',
        COUNT_GAMES: 'countGames',
    },
    PLAYERS: {
        VIEW_ALL_PLAYERS: 'viewAllPlayers',
        VIEW_ANY_PLAYER: 'viewAnyPlayer',
        // CREATE_ANY_PLAYER: 'createAnyPlayer',
        // UPDATE_ANY_PLAYER: 'updateAnyPlayer',
        DELETE_ANY_PLAYER: 'deleteAnyPlayer',
        // ARCHIVE_ANY_PLAYER: 'archiveAnyPlayer',
        COUNT_PLAYERS: 'countPlayers',
    },
    USERS: {
        VIEW_ALL_USERS: 'viewAllUsers',
        VIEW_ANY_USER: 'viewAnyUser',
        CREATE_ANY_USER: 'createAnyUser',
        UPDATE_ANY_USER: 'updateAnyUser',
        DELETE_ANY_USER: 'deleteAnyUser',
        ARCHIVE_ANY_USER: 'archiveAnyUser',
        COUNT_USERS: 'countUsers',
        RUN_UPDATE_FIXES: 'runUpdatesAndFixes',
        CREATE_PAYMENT_METHODS: 'createPaymentMethods',
        VIEW_PAYMENT_METHODS: 'viewPaymentMethods',
        UPDATE_PAYMENT_METHODS: 'updatePaymentMethods',
        VIEW_ANY_WALLET: 'viewAnyWallet',
        ADD_WALLET_FUNDS: 'addWalletFunds',
        VIEW_WALLET_FUNDS: 'viewWalletFunds',
        CALCULATE_WALLET_NET_FUNDS: 'calculateWalletNetFunds',
    },
    TEAMS: {
        VIEW_ALL_TEAMS: 'viewAllTeams',
        VIEW_ANY_TEAM: 'viewAnyTeam',
        COUNT_TEAMS: 'countTeams',
    },
    TOP_UPS: {
        VIEW_ALL_TOP_UPS: 'viewAllTopUps',
        VIEW_ANY_TOP_UP: 'viewAnyTopUp',
        // CREATE_ANY_TOP_UP: 'createAnyTopUp',
        // UPDATE_ANY_TOP_UP: 'updateAnyTopUp',
        // DELETE_ANY_TOP_UP: 'deleteAnyTopUp',
        // ARCHIVE_ANY_TOP_UP: 'archiveAnyTopUp',
        COUNT_TOP_UPS: 'countTopUps',
    },
};

export enum ROLES {
    ADMIN = 'admin',
    USER = 'user',
}
