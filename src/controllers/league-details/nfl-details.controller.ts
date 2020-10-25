// Uncomment these imports to begin using these cool features!

import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { get } from '@loopback/rest';
import { SportsDataService } from '@src/services';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

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
    async currentSeason(): Promise<ICommonHttpResponse<number> | undefined> {
        try {
            const currentSeason = await this.sportDataService.currentSeason();
            return { data: currentSeason };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }
}
