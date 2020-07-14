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
