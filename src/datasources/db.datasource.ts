import { inject, lifeCycleObserver, LifeCycleObserver, ValueOrPromise } from '@loopback/core';
import { juggler } from '@loopback/repository';
import chalk from 'chalk';

export const defaultDbConfig = {
    name: 'db',
    connector: 'postgresql',
    retryAttempts: 5,
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class DbDataSource extends juggler.DataSource implements LifeCycleObserver {
    static dataSourceName = 'db';
    static readonly defaultConfig = defaultDbConfig;

    constructor(
        @inject('datasources.config.db', { optional: true })
        dsConfig: object = defaultDbConfig,
    ) {
        super(dsConfig);
    }

    /**
     * Start the datasource when application is started
     */
    start(): ValueOrPromise<void> {
        console.log(chalk.greenBright(`Connection established...`));
    }

    /**
     * Disconnect the datasource when application is stopped. This allows the
     * application to be shut down gracefully.
     */
    stop(): ValueOrPromise<void> {
        return super.disconnect();
    }
}
