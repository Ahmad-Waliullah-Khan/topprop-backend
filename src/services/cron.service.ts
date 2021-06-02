import { injectable, service, BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { PROXY_DAY, PROXY_MONTH, PROXY_YEAR, PROXY_WEEK, PROXY_DAY_OFFSET } from '../utils/constants';

import { SportsDataService, TIMEFRAMES } from '@src/services';
import { Timeframe } from '@src/models';
import { TimeframeRepository } from '@src/repositories';

import moment from 'moment';

const runType = process.env.RUN_TYPE || 'principle';

@injectable({ scope: BindingScope.TRANSIENT })
export class CronService {
    constructor(
        @service() private sportDataService: SportsDataService,
        @repository('TimeframeRepository') private timeframeRepository: TimeframeRepository,
    ) {}

    async fetchDate() {
        if (runType === 'principle') {
            return moment();
        } else {
            return moment(`${PROXY_YEAR}-${PROXY_MONTH}-${PROXY_DAY}`, 'YYYY-MMM-DD');
        }
    }

    async fetchSeason() {
        if (runType === 'principle') {
            const currentDate = moment();
            const currentMonth = currentDate.month();
            if (currentMonth < 6) {
                // Before July
                return currentDate.subtract(1, 'years').year();
            } else {
                // July Onwards
                return currentDate.year();
            }
        } else {
            const currentDate = moment(`${PROXY_YEAR}-${PROXY_MONTH}-${PROXY_DAY}`, 'YYYY-MMM-DD');
            const currentMonth = currentDate.month();
            if (currentMonth < 6) {
                // Before July
                return currentDate.subtract(1, 'years').year();
            } else {
                // July Onwards
                return currentDate.year();
            }
        }
    }

    async fetchTimeframe() {
        if (runType === 'principle') {
            const [remoteTimeFrame] = await this.sportDataService.timeFrames(TIMEFRAMES.CURRENT);
            const currentTimeFrame = new Timeframe(remoteTimeFrame);
            return currentTimeFrame;
        } else {
            const currentDate = moment(`${PROXY_YEAR}-${PROXY_MONTH}-${PROXY_DAY}`, 'YYYY-MMM-DD');
            currentDate.add(PROXY_DAY_OFFSET, 'days');
            // console.log("🚀 ~ file: cron.service.ts ~ line 60 ~ CronService ~ fetchTimeframe ~ currentDate", currentDate)
            const [currentTimeFrame] = await this.timeframeRepository.find({
                where: { and: [{ startDate: { lte: currentDate } }, { endDate: { gte: currentDate } }] },
            });
            return currentTimeFrame;
        }
    }
}
