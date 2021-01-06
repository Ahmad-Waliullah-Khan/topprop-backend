// Uncomment these imports to begin using these cool features!

import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { get, param } from '@loopback/rest';
import { SportsDataService, TIMEFRAMES } from '@src/services';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, IRemoteGame, ITimeFrame } from '@src/utils/interfaces';
import { isEqual } from 'lodash';

export class NflDetailsController {
    constructor(@service() private sportDataService: SportsDataService) {}
    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.NFL_DETAILS.VIEW_WEEK_DETAILS)] })
    @get(API_ENDPOINTS.LEAGUE_DETAILS.NFL.CURRENT_WEEK, {
        responses: {
            '200': {
                description: 'Current NFL week',
                content: {
                    'application/json': {
                        schema: {
                            type: 'number',
                        },
                    },
                },
            },
        },
    })
    async currentWeek(): Promise<ICommonHttpResponse<number> | undefined> {
        try {
            const currentWeek = await this.sportDataService.currentWeek();
            return { data: currentWeek };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.NFL_DETAILS.VIEW_SEASON_DETAILS)] })
    @get(API_ENDPOINTS.LEAGUE_DETAILS.NFL.CURRENT_SEASON, {
        responses: {
            '200': {
                description: 'Current NFL season',
                content: {
                    'application/json': {
                        schema: {
                            type: 'number',
                        },
                    },
                },
            },
        },
    })
    async currentSeason(): Promise<ICommonHttpResponse<string> | undefined> {
        try {
            const [currentTimeFrame] = await this.sportDataService.timeFrames(TIMEFRAMES.CURRENT);
            return { data: currentTimeFrame.ApiSeason };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.NFL_DETAILS.VIEW_TIME_FRAMES)] })
    @get(API_ENDPOINTS.LEAGUE_DETAILS.NFL.TIME_FRAMES, {
        responses: {
            '200': {
                description: 'NFL time frames',
            },
        },
    })
    async timeFrames(
        @param.path.string('timeFrame') timeFrame: TIMEFRAMES,
    ): Promise<ICommonHttpResponse<ITimeFrame[]> | undefined> {
        try {
            const timeFrames = await this.sportDataService.timeFrames(timeFrame);
            return { data: timeFrames };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.NFL_DETAILS.VIEW_SCHEDULE_DETAILS)] })
    @get(API_ENDPOINTS.LEAGUE_DETAILS.NFL.SCHEDULE_BY_SEASON)
    async seasonSchedule(
        @param.path.string('season') season: string,
    ): Promise<ICommonHttpResponse<IRemoteGame[]> | undefined> {
        try {
            const schedule = await this.sportDataService.scheduleBySeason(season);
            return { data: schedule };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.NFL_DETAILS.VIEW_SCHEDULE_DETAILS)] })
    @get(API_ENDPOINTS.LEAGUE_DETAILS.NFL.SCHEDULE_BY_WEEK)
    async weekSchedule(
        @param.path.string('season') season: string,
        @param.path.number('week') week: number,
    ): Promise<ICommonHttpResponse<IRemoteGame[]> | undefined> {
        try {
            const schedule = await this.sportDataService.scheduleBySeason(season);
            return { data: schedule.filter(game => isEqual(game.Week, week) && !isEqual(game.Status, 'Postponed')) };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }
}
