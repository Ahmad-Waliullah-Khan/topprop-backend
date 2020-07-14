export const PERMISSIONS = {
    CONTESTS: {
        VIEW_ALL_CONTESTS: 'viewAllContests',
        VIEW_ANY_CONTEST: 'viewAnyContest',
        CREATE_ANY_CONTEST: 'createAnyContest',
        UPDATE_ANY_CONTEST: 'updateAnyContest',
        DELETE_ANY_CONTEST: 'deleteAnyContest',
        ARCHIVE_ANY_CONTEST: 'archiveAnyContest',
        COUNT_CONTESTS: 'countContests',
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
    },
};

export enum ROLES {
    ADMIN = 'admin',
    USER = 'user',
}
