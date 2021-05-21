import { injectable, /* inject, */ BindingScope } from '@loopback/core';
import { PROXY_DAY, PROXY_MONTH, PROXY_YEAR } from '../utils/constants';

import moment from 'moment';

const runType = process.env.RUN_TYPE || 'principle';

@injectable({ scope: BindingScope.TRANSIENT })
export class CronService {
    constructor(/* Add @inject to inject parameters */) {}

    async fetchDate() {
        if (runType === 'principle') {
            return moment();
        } else {
            return moment(`${PROXY_YEAR}-${PROXY_MONTH}-${PROXY_DAY}`,"YYYY-MMM-DD");
        }
    }
}
