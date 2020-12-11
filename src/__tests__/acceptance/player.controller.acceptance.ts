import { Filter } from '@loopback/repository';
import { Client, expect } from '@loopback/testlab';
import { Player } from '@src/models';
import { PlayerService, TeamService } from '@src/services';
import { API_RESOURCES } from '@src/utils/constants';
import { TopPropBackendApplication } from '../..';
import { setupApplication } from './test-helper';

describe('Player Controller', () => {
    let app: TopPropBackendApplication;
    let client: Client;
    const apiV1Endpoint = '/api/v1';
    const playersResource = API_RESOURCES.PLAYERS;
    const userResource = API_RESOURCES.USERS;
    const playersBaseAPI = `${apiV1Endpoint}/${playersResource}`;
    const usersBaseAPI = `${apiV1Endpoint}/${userResource}`;
    let adminAuthToken1 = 'Bearer ';
    let userAuthToken1 = 'Bearer ';
    let testUserId1 = 0;
    let adminId1 = 0;
    let testContactSubmissionId1 = 0;
    let testContactSubmissionId2 = 0;
    let testContactSubmissionId3 = 0;

    before('setupApplication', async () => {
        ({ app, client } = await setupApplication());
    });
    before('Prepare test resources', async () => {
        //* CONSIDER ALWAYS CREATE THE ADMIN AT THE END SINCE ON THE AFTER ALL HOOK THE ADMIN MUST BE THE LAST USER TO BE DELETED.
        //Sign up user
        const userSignupRes1 = await client.post(`${usersBaseAPI}/sign-up`).send({
            fullName: 'test full name',
            email: 'test-user@gb.com',
            username: '@test-user1',
            password: '12345678',
            confirmPassword: '12345678',
        });

        testUserId1 = userSignupRes1.body.user.id;
        userAuthToken1 += userSignupRes1.body.data;

        //Sign up admin
        const adminSignupRes1 = await client.post(`${usersBaseAPI}/sign-up`).send({
            fullName: 'test admin',
            email: process.env.ADMIN_EMAIL,
            username: '@test-admin1',
            password: 'TopPropTestPWD.10',
            confirmPassword: 'TopPropTestPWD.10',
        });
        adminId1 = adminSignupRes1.body.user.id;
        adminAuthToken1 += adminSignupRes1.body.data;
    });

    before(`Load default teams & players`, async () => {
        const teamService = await app.service(TeamService).getValue(app);
        await teamService._init();

        const playerService = await app.service(PlayerService).getValue(app);
        await playerService._init();
    });

    after(async () => {
        let users = await client.get(`${usersBaseAPI}`).set('Authorization', adminAuthToken1);
        console.log('Removing all users...');
        for (let index = 0; index < users.body.data.length; index++) {
            const user = users.body.data[index];
            await client.delete(`${usersBaseAPI}/${user.id}`).set('Authorization', adminAuthToken1);
        }
        await app.stop();
    });

    describe('GET Method - List Players  (Root endpoint /players)', async () => {
        it('Should not list players without auth token', async () => {
            await client.get(playersBaseAPI).expect(401);
        });
        it('Should list players', async () => {
            const res = await client.get(playersBaseAPI).set('Authorization', adminAuthToken1).expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
        });
        it('Should list players with filter', async () => {
            const filter: Filter<Player> = { include: [{ relation: 'team' }] };
            const res = await client
                .get(playersBaseAPI)
                .set('Authorization', adminAuthToken1)
                .query({ filter: JSON.stringify(filter) })
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
            expect(res.body.data[0]).to.be.have.property('team');
        });
    });
    describe('POST Method - Google Sheets Import Simulation', async () => {
        it(`Should reach the server with the provided players' data `, async () => {
            await client
                .post(`${playersBaseAPI}/google-sheets/import`)
                .set('g-sheets-auth-header', 'auth-header')
                .send({ data: [] })
                .expect(200);
        });
    });
});
