import { forOwn } from 'lodash';
import { PERMISSIONS } from '../constants';

export class UserHelpers {
    static defaultPermissions(isAdmin = false) {
        let defaultPermissions: string[] = [];

        let betPermissions: string[] = [];
        let contactSubmissionPermissions: string[] = [];
        let contestPermissions: string[] = [];
        let contenderPermissions: string[] = [];
        let gainPermissions: string[] = [];
        let gamePermissions: string[] = [];
        let playerPermissions: string[] = [];
        let userPermissions: string[] = [];
        let teamPermissions: string[] = [];
        let topUpPermissions: string[] = [];

        if (isAdmin) {
            forOwn(PERMISSIONS.BETS, (value, key) => betPermissions.push(value));
            forOwn(PERMISSIONS.CONTACT_SUBMISSIONS, (value, key) => contactSubmissionPermissions.push(value));
            forOwn(PERMISSIONS.CONTENDERS, (value, key) => contenderPermissions.push(value));
            forOwn(PERMISSIONS.CONTESTS, (value, key) => contestPermissions.push(value));
            forOwn(PERMISSIONS.GAINS, (value, key) => gainPermissions.push(value));
            forOwn(PERMISSIONS.GAMES, (value, key) => gamePermissions.push(value));
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
            contenderPermissions.push(
                PERMISSIONS.CONTENDERS.VIEW_ALL_CONTENDERS,
                PERMISSIONS.CONTENDERS.COUNT_CONTENDERS,
                PERMISSIONS.CONTENDERS.CREATE_ANY_CONTENDER,
            );
            contestPermissions.push(
                PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS,
                PERMISSIONS.CONTESTS.VIEW_ANY_CONTEST,
                PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST,
                PERMISSIONS.CONTESTS.UPDATE_ANY_CONTEST,
                PERMISSIONS.CONTESTS.COUNT_CONTESTS,
                PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS_TOTAL,
            );
            gainPermissions.push(PERMISSIONS.GAINS.VIEW_ALL_GAINS, PERMISSIONS.GAINS.COUNT_GAINS);
            gamePermissions.push(
                PERMISSIONS.GAMES.VIEW_ALL_GAMES,
                PERMISSIONS.GAMES.VIEW_ANY_GAME,
                PERMISSIONS.GAMES.COUNT_GAMES,
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
                PERMISSIONS.USERS.VIEW_PAYMENT_METHODS,
            );
            teamPermissions.push(
                PERMISSIONS.TEAMS.COUNT_TEAMS,
                PERMISSIONS.TEAMS.VIEW_ALL_TEAMS,
                PERMISSIONS.TEAMS.VIEW_ANY_TEAM,
            );
            topUpPermissions.push();
            betPermissions.push(PERMISSIONS.BETS.VIEW_ALL_BETS, PERMISSIONS.BETS.COUNT_BETS);
        }
        return defaultPermissions.concat(
            betPermissions,
            contactSubmissionPermissions,
            contenderPermissions,
            contestPermissions,
            gainPermissions,
            gamePermissions,
            playerPermissions,
            userPermissions,
            teamPermissions,
            topUpPermissions,
        );
    }
}
