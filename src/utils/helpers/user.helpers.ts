import { forOwn } from 'lodash';
import { PERMISSIONS } from '../constants';

export class UserHelpers {
    static defaultPermissions(isAdmin = false) {
        let defaultPermissions: string[] = [];

        let userPermissions: string[] = [];
        let contestPermissions: string[] = [];

        if (isAdmin) {
            forOwn(PERMISSIONS.CONTESTS, (value, key) => contestPermissions.push(value));
            forOwn(PERMISSIONS.USERS, (value, key) => userPermissions.push(value));
        } else {
            contestPermissions.push(
                PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS,
                PERMISSIONS.CONTESTS.VIEW_ANY_CONTEST,
                PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST,
                PERMISSIONS.CONTESTS.UPDATE_ANY_CONTEST,
                PERMISSIONS.CONTESTS.COUNT_CONTESTS,
            );
            userPermissions.push(PERMISSIONS.USERS.VIEW_ANY_USER, PERMISSIONS.USERS.UPDATE_ANY_USER);
        }
        return defaultPermissions.concat(contestPermissions, userPermissions);
    }
}
