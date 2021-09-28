//* LOAD ENV VARIABLES AT THE VERY BEGINNING
require('dotenv').config();
import {CronBindings} from '@loopback/cron';
import chalk from 'chalk';
import {isEqual} from 'lodash';
import 'module-alias/register';
import {ApplicationConfig, TopPropBackendApplication} from './application';
import {ContestPayoutService, PaymentGatewayService, UserService} from './services';
import {CRON_JOBS} from './utils/constants';

export * from './application';

export async function main(options: ApplicationConfig = {}) {
    const app = new TopPropBackendApplication(options);
    await app.boot();

    //* AutoMigrate DB
    await app.migrateSchema({ existingSchema: 'alter' });
    await app.start();

    const url = app.restServer.url;
    console.log(`TopProp server is running at ${url}`);

    //* UPDATE PERMISSIONS ON EVERY START
    const userService = await app.service(UserService).getValue(app);
    userService
        .syncDefaultPermissions()
        .then(() => console.log(chalk.greenBright(`Permissions updated!`)))
        .catch(err => console.error(chalk.redBright(`Error updating permissions. Error: `, err)));

    // const teamService = await app.service(TeamService).getValue(app);
    // await teamService._init();
    // const playerService = await app.service(PlayerService).getValue(app);
    // await playerService._init();

    //*GAMES
    // const gameService = await app.service(GameService).getValue(app);
    // await gameService._init();

    const contestPayoutService = await app.service(ContestPayoutService).getValue(app);
    contestPayoutService.createDefaults();

    const component = await app.get(CronBindings.COMPONENT);
    const cronJobs = await component.getJobs();
    for (let index = 0; index < cronJobs.length; index++) {
        const job = cronJobs[index];
        // if (isEqual(job.name, CRON_JOBS.FAKE_RESULTS_CRON) && !isEqual(process.env.RUN_FAKE_RESULTS_CRON, 'true'))
        //     job.stop();
        if (isEqual(job.name, CRON_JOBS.SYNC_TEAMS_CRON) && !isEqual(process.env.RUN_SYNC_TEAMS_CRON, 'true'))
            job.stop();
        if (isEqual(job.name, CRON_JOBS.SYNC_GAMES_CRON) && !isEqual(process.env.RUN_SYNC_GAMES_CRON, 'true'))
            job.stop();
        if (isEqual(job.name, CRON_JOBS.PLAYER_RESULTS_CRON) && !isEqual(process.env.RUN_PLAYER_RESULTS_CRON, 'true'))
            job.stop();
    }

    const paymentGatewayService = await app.service(PaymentGatewayService).getValue(app);
    paymentGatewayService
        .upsertWebhooks()
        .then(() => {
            console.log(`dwolla webhooks upserted`);
        })
        .catch(err => {
            console.error(`Error upserting webhooks. `, err);
        });

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
            expressSettings: {
                'x-powered-by': false,
                'trust proxy': true,
            },
        },
    };
    main(config).catch(err => {
        console.error('Cannot start the application.', err);
        process.exit(1);
    });
}
