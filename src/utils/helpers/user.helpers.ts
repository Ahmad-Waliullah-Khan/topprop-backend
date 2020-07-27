import { forOwn } from 'lodash';
import { PERMISSIONS } from '../constants';

export class UserHelpers {
    static defaultPermissions(isAdmin = false) {
        let defaultPermissions: string[] = [];

        let contactSubmissionPermissions: string[] = [];
        let contestPermissions: string[] = [];
        let playerPermissions: string[] = [];
        let userPermissions: string[] = [];
        let teamPermissions: string[] = [];
        let topUpPermissions: string[] = [];

        if (isAdmin) {
            forOwn(PERMISSIONS.CONTACT_SUBMISSIONS, (value, key) => contactSubmissionPermissions.push(value));
            forOwn(PERMISSIONS.CONTESTS, (value, key) => contestPermissions.push(value));
            forOwn(PERMISSIONS.PLAYERS, (value, key) => playerPermissions.push(value));
            forOwn(PERMISSIONS.USERS, (value, key) => userPermissions.push(value));
            forOwn(PERMISSIONS.TEAMS, (value, key) => teamPermissions.push(value));
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
            playerPermissions.push(
                PERMISSIONS.PLAYERS.COUNT_PLAYERS,
                PERMISSIONS.PLAYERS.DELETE_ANY_PLAYER,
                PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS,
                PERMISSIONS.PLAYERS.VIEW_ANY_PLAYER,
            );
            userPermissions.push(
                PERMISSIONS.USERS.VIEW_ANY_USER,
                PERMISSIONS.USERS.UPDATE_ANY_USER,
                PERMISSIONS.USERS.VIEW_ANY_WALLET,
                PERMISSIONS.USERS.ADD_WALLET_FUNDS,
                PERMISSIONS.USERS.VIEW_WALLET_FUNDS,
                PERMISSIONS.USERS.CREATE_PAYMENT_METHODS,
                PERMISSIONS.USERS.UPDATE_PAYMENT_METHODS,
            );
            teamPermissions.push(
                PERMISSIONS.TEAMS.COUNT_TEAMS,
                PERMISSIONS.TEAMS.VIEW_ALL_TEAMS,
                PERMISSIONS.TEAMS.VIEW_ANY_TEAM,
            );
            topUpPermissions.push();
        }
        return defaultPermissions.concat(
            contactSubmissionPermissions,
            contestPermissions,
            playerPermissions,
            userPermissions,
            teamPermissions,
            topUpPermissions,
        );
    }
}
