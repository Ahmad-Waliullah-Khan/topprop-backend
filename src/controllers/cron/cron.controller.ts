import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {service} from '@loopback/core';
import {get, HttpErrors} from '@loopback/rest';
import {CronService} from '@src/services';
import {API_ENDPOINTS, CRON_JOBS, CRON_RUN_TYPES, PERMISSIONS, RUN_TYPE} from '@src/utils/constants';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse} from '@src/utils/interfaces';
import {CRON_MESSAGES} from '@src/utils/messages';
import chalk from 'chalk';
import logger from '../../utils/logger';

// import {inject} from '@loopback/core';

export class CronController {
    constructor(@service() private cronService: CronService) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.FETCH_PROJECTIONS, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async fetchProjecttion(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE)
            throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);

        const playerPromises = await this.cronService.processProjectedFantasyPoints();
        Promise.all(playerPromises);
        this.cronService.cronLogger(CRON_JOBS.PROJECTED_FANTASY_POINTS_CRON);

        return { data: 'Fetched Projections' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.FETCH_POINTS, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async fetchPoints(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE)
            throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);

        const playerPromises = await this.cronService.processPlayerFantasyPoints();
        Promise.all(playerPromises);
        this.cronService.cronLogger(CRON_JOBS.PLAYER_FANTASY_POINTS_CRON);
        return { data: 'Fetched Points' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.WIN_CHECK, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async winCheck(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE)
            throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);
        try {
            const filteredContests = await this.cronService.winCheck();
            this.cronService.cronLogger(CRON_JOBS.WIN_CHECK_CRON);

            return { data: filteredContests };
        } catch (error) {
            logger.error(chalk.redBright(`Error on win criteria cron job. Error: `, error));
        }

        return { data: 'Win Check' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.LEAGUE_WIN_CHECK, {
        responses: {
            '200': {
                description: 'Run League Contest Win Check Cron Job',
            },
        },
    })
    async leagueWinCheck(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE)
            throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);
        try {
            const filteredContests = await this.cronService.leagueWinCheck();
            this.cronService.cronLogger(CRON_JOBS.WIN_CHECK_CRON);

            return { data: filteredContests };
        } catch (error) {
            logger.error(chalk.redBright(`Error on league win criteria cron job. Error: `, error));
        }

        return { data: 'League Win Check' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.CLOSE_CONTESTS, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async closeContests(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE)
            throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);
        try {
            const filteredContests = this.cronService.closeContests();
            this.cronService.cronLogger(CRON_JOBS.CLOSE_CONTEST_CRON);

            return { data: filteredContests };
        } catch (error) {
            logger.error(chalk.redBright(`Error on close contests cron job. Error: `, error));
        }

        return { data: 'Win Check' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.CLOSE_LEAGUE_CONTESTS, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async closeLeagueContests(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE)
            throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);
        try {
            const filteredContests = await this.cronService.leagueCloseContests();
            const filteredBattlegroundContest = await this.cronService.closeContests();
            this.cronService.cronLogger(CRON_JOBS.CLOSE_CONTEST_CRON);

            const contests = {
                "leagueContests": filteredContests,
                "battlegroundContests": filteredBattlegroundContest
            }

            return { data: contests };
        } catch (error) {
            logger.error(chalk.redBright(`Error on league close contests cron job. Error: `, error));
        }

        return { data: 'Win Check' };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CRONS.SYNC, {
        responses: {
            '200': {
                description: 'Run Cron Job',
            },
        },
    })
    async syncLeagues(): Promise<ICommonHttpResponse> {
        if (RUN_TYPE === CRON_RUN_TYPES.PRINCIPLE)
            throw new HttpErrors.BadRequest(CRON_MESSAGES.API_NOT_AVAILABLE_PROD);
        try {
            const syncedEspnLeagues = await this.cronService.syncESPNLeagues();
            this.cronService.cronLogger(CRON_JOBS.ESPN_SYNC_LEAGUES_CRON);

            const syncedYahooLeagues = await this.cronService.syncYahooLeagues();
            this.cronService.cronLogger(CRON_JOBS.ESPN_SYNC_LEAGUES_CRON);

            return { data: { espn: syncedEspnLeagues, yahoo: syncedYahooLeagues } };
        } catch (error) {
            logger.error(chalk.redBright(`Error on sync leagues cron job. Error: `, error));
        }

        return { data: 'Win Check' };
    }
}
