import { forOwn } from 'lodash';
import { PERMISSIONS } from '../constants';

export class UserHelpers {
    static defaultPermissions(isAdmin = false) {
        let defaultPermissions: string[] = [];

        let userPermissions: string[] = [];

        if (isAdmin) {
            forOwn(PERMISSIONS.USERS, (value, key) => userPermissions.push(value));
        } else {
            userPermissions.push(PERMISSIONS.USERS.VIEW_ANY_USER, PERMISSIONS.USERS.UPDATE_ANY_USER);
        }
        return defaultPermissions.concat(userPermissions);
    }
}
