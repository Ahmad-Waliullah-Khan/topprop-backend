import { forOwn } from 'lodash';
import { PERMISSIONS } from '../constants';

export class UserHelpers {
    static defaultPermissions(isAdmin = false) {
        let defaultPermissions: string[] = [];

        let contactSubmissionPermissions: string[] = [];
        let contestPermissions: string[] = [];
        let userPermissions: string[] = [];
        let topUpPermissions: string[] = [];

        if (isAdmin) {
            forOwn(PERMISSIONS.CONTACT_SUBMISSIONS, (value, key) => contactSubmissionPermissions.push(value));
            forOwn(PERMISSIONS.CONTESTS, (value, key) => contestPermissions.push(value));
            forOwn(PERMISSIONS.USERS, (value, key) => userPermissions.push(value));
            forOwn(PERMISSIONS.TOP_UPS, (value, key) => topUpPermissions.push(value));
        } else {
            contactSubmissionPermissions.push(
                PERMISSIONS.CONTACT_SUBMISSIONS.CREATE_ANY_CONTACT_SUBMISSION,
                PERMISSIONS.CONTACT_SUBMISSIONS.VIEW_ANY_CONTACT_SUBMISSION,
                PERMISSIONS.CONTACT_SUBMISSIONS.VIEW_ALL_CONTACT_SUBMISSIONS,
            );
            contestPermissions.push(
                PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS,
                PERMISSIONS.CONTESTS.VIEW_ANY_CONTEST,
                PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST,
                PERMISSIONS.CONTESTS.UPDATE_ANY_CONTEST,
                PERMISSIONS.CONTESTS.COUNT_CONTESTS,
            );
            userPermissions.push(
                PERMISSIONS.USERS.VIEW_ANY_USER,
                PERMISSIONS.USERS.UPDATE_ANY_USER,
                PERMISSIONS.USERS.VIEW_ANY_WALLET,
                PERMISSIONS.USERS.ADD_WALLET_FUNDS,
                PERMISSIONS.USERS.VIEW_WALLET_FUNDS,
            );
            topUpPermissions.push();
        }
        return defaultPermissions.concat(
            contactSubmissionPermissions,
            contestPermissions,
            userPermissions,
            topUpPermissions,
        );
    }
}
