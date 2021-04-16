import { RestApplication } from '@loopback/rest';
import { defaultDbConfig } from '@src/datasources';
import { merge } from 'lodash';

export class ApplicationHelpers {
    static bindDbSourceCredential(app: RestApplication) {
        if (
            !process.env.POSTGRES_HOST ||
            !process.env.POSTGRES_USER ||
            !process.env.POSTGRES_PASSWORD ||
            !process.env.POSTGRES_DB ||
            !process.env.POSTGRES_PORT
        )
            throw new Error('Must provide DB Credentials.');
        const updatedDataSourceCredentials = merge(defaultDbConfig, {
            host: process.env.POSTGRES_HOST,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
            port: +process.env.POSTGRES_PORT,
        });
        app.bind('datasources.config.db').to(updatedDataSourceCredentials);
    }

    static bindTestDbSourceCredential(app: RestApplication) {
        if (!process.env.POSTGRES_DB || !process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD)
            throw new Error('Must provide TEST DB Credentials.');

        //* Set node env to test;
        process.env.NODE_ENV = 'test';

        const updatedDataSourceCredentials = merge(defaultDbConfig, {
            host: 'localhost',
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
            port: +'5432',
        });
        app.bind('datasources.config.db').to(updatedDataSourceCredentials);
    }
}
