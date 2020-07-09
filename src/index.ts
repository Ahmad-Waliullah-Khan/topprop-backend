//* LOAD ENV VARIABLES AT THE VERY BEGINNING
require('dotenv').config();
import chalk from 'chalk';
import 'module-alias/register';
import { ApplicationConfig, TopPropBackendApplication } from './application';
import { UserService } from './services';

export * from './application';

export async function main(options: ApplicationConfig = {}) {
    const app = new TopPropBackendApplication(options);
    await app.boot();

    //* AutoMigrate DB
    await app.migrateSchema({ existingSchema: 'alter' });
    await app.start();

    const url = app.restServer.url;
    console.log(`Top Prop server is running at ${url}`);

    //* UPDATE PERMISSIONS ON EVERY START
    const userService = await app.service(UserService).getValue(app);
    userService
        .syncDefaultPermissions()
        .then(() => console.log(chalk.greenBright(`Permissions updated!`)))
        .catch(err => console.error(chalk.redBright(`Error updating permissions. Error: `, err)));

    return app;
}

if (require.main === module) {
    // Run the application
    const config = {
        rest: {
            port: +(process.env.PORT ?? 3000),
            host: process.env.HOST,
            // The `gracePeriodForClose` provides a graceful close for http/https
            // servers with keep-alive clients. The default value is `Infinity`
            // (don't force-close). If you want to immediately destroy all sockets
            // upon stop, set its value to `0`.
            // See https://www.npmjs.com/package/stoppable
            gracePeriodForClose: 5000, // 5 seconds
            // openApiSpec: {
            //     // useful when used with OpenAPI-to-GraphQL to locate your application
            //     setServersFromRequest: true,
            // },
        },
    };
    main(config).catch(err => {
        console.error('Cannot start the application.', err);
        process.exit(1);
    });
}
