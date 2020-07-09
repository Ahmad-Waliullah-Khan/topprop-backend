import { Client, createRestAppClient, givenHttpServerConfig } from '@loopback/testlab';
import { ApplicationHelpers } from '@src/utils/helpers';
import { TopPropBackendApplication } from '../..';

export async function setupApplication(): Promise<AppWithClient> {
    const restConfig = givenHttpServerConfig({
        // Customize the server configuration here.
        // Empty values (undefined, '') will be ignored by the helper.
        //
        host: process.env.HOST,
        port: 3000,
    });

    const app = new TopPropBackendApplication({
        rest: restConfig,
    });

    //Binding DB credentials
    ApplicationHelpers.bindTestDbSourceCredential(app);

    await app.boot();
    await app.migrateSchema({
        existingSchema: 'drop',
    });
    await app.start();

    const client = createRestAppClient(app);

    return { app, client };
}

export interface AppWithClient {
    app: TopPropBackendApplication;
    client: Client;
}
