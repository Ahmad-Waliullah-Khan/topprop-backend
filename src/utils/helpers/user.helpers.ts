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
        let nflDetailsPermissions: string[] = [];
        let playerPermissions: string[] = [];
        let userPermissions: string[] = [];
        let teamPermissions: string[] = [];
        let topUpPermissions: string[] = [];
        let withdrawRequestPermissions: string[] = [];

        if (isAdmin) {
            forOwn(PERMISSIONS.BETS, (value, key) => betPermissions.push(value));
            forOwn(PERMISSIONS.CONTACT_SUBMISSIONS, (value, key) => contactSubmissionPermissions.push(value));
            forOwn(PERMISSIONS.CONTENDERS, (value, key) => contenderPermissions.push(value));
            forOwn(PERMISSIONS.CONTESTS, (value, key) => contestPermissions.push(value));
            forOwn(PERMISSIONS.GAINS, (value, key) => gainPermissions.push(value));
            forOwn(PERMISSIONS.GAMES, (value, key) => gamePermissions.push(value));
            forOwn(PERMISSIONS.NFL_DETAILS, (value, key) => nflDetailsPermissions.push(value));
            forOwn(PERMISSIONS.PLAYERS, (value, key) => playerPermissions.push(value));
            forOwn(PERMISSIONS.USERS, (value, key) => userPermissions.push(value));
            forOwn(PERMISSIONS.TEAMS, (value, key) => teamPermissions.push(value));
            forOwn(PERMISSIONS.TOP_UPS, (value, key) => topUpPermissions.push(value));
            forOwn(PERMISSIONS.WITHDRAW_REQUESTS, (value, key) => withdrawRequestPermissions.push(value));
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
                //*STATS
                PERMISSIONS.CONTESTS.VIEW_CONVERSION_STATISTIC,
                PERMISSIONS.CONTESTS.CALCULATE_AMOUNTS,
            );
            gainPermissions.push(PERMISSIONS.GAINS.VIEW_ALL_GAINS, PERMISSIONS.GAINS.COUNT_GAINS);
            gamePermissions.push(
                PERMISSIONS.GAMES.VIEW_ALL_GAMES,
                PERMISSIONS.GAMES.VIEW_ANY_GAME,
                PERMISSIONS.GAMES.COUNT_GAMES,
            );
            nflDetailsPermissions.push(
                PERMISSIONS.NFL_DETAILS.VIEW_SEASON_DETAILS,
                PERMISSIONS.NFL_DETAILS.VIEW_WEEK_DETAILS,
                PERMISSIONS.NFL_DETAILS.VIEW_SCHEDULE_DETAILS,
                PERMISSIONS.NFL_DETAILS.VIEW_TIME_FRAMES,
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
                PERMISSIONS.USERS.VIEW_ANY_WALLET_INFO,
                PERMISSIONS.USERS.GENERATE_ACCOUNT_VERIFICATION_TOKEN,
                PERMISSIONS.USERS.REMOVE_ANY_FUNDING_SOURCE,
                PERMISSIONS.USERS.VIEW_ANY_FUNDING_SOURCE,
                PERMISSIONS.USERS.UPDATE_ANY_WALLET_INFO,
                PERMISSIONS.USERS.VIEW_ANY_WALLET_BALANCE,
                PERMISSIONS.USERS.FUND_ANY_WALLET,
                PERMISSIONS.USERS.UPLOAD_VERIFICATION_FILE,
                PERMISSIONS.USERS.VIEW_ANY_TRANSFER,
            );
            teamPermissions.push(
                PERMISSIONS.TEAMS.COUNT_TEAMS,
                PERMISSIONS.TEAMS.VIEW_ALL_TEAMS,
                PERMISSIONS.TEAMS.VIEW_ANY_TEAM,
            );
            topUpPermissions.push();
            betPermissions.push(PERMISSIONS.BETS.VIEW_ALL_BETS, PERMISSIONS.BETS.COUNT_BETS);

            withdrawRequestPermissions.push(
                PERMISSIONS.WITHDRAW_REQUESTS.CREATE_ANY_WITHDRAW_REQUESTS,
                PERMISSIONS.WITHDRAW_REQUESTS.COUNT_WITHDRAW_REQUESTS,
                PERMISSIONS.WITHDRAW_REQUESTS.VIEW_ALL_WITHDRAW_REQUESTS,
                PERMISSIONS.WITHDRAW_REQUESTS.VIEW_ANY_WITHDRAW_REQUEST,
            );
        }
        return defaultPermissions.concat(
            betPermissions,
            contactSubmissionPermissions,
            contenderPermissions,
            contestPermissions,
            gainPermissions,
            gamePermissions,
            nflDetailsPermissions,
            playerPermissions,
            userPermissions,
            teamPermissions,
            topUpPermissions,
            withdrawRequestPermissions,
        );
    }
}
