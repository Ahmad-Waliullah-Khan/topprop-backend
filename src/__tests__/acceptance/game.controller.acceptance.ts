import { Filter } from '@loopback/repository';
import { Client, expect } from '@loopback/testlab';
import { Player } from '@src/models';
import { TeamService } from '@src/services';
import { GameService } from '@src/services/game.service';
import { API_RESOURCES } from '@src/utils/constants';
import { TopPropBackendApplication } from '../..';
import { setupApplication } from './test-helper';

describe('Game Controller', () => {
    let app: TopPropBackendApplication;
    let client: Client;
    const apiV1Endpoint = '/api/v1';
    const gamesResource = API_RESOURCES.GAMES;
    const userResource = API_RESOURCES.USERS;
    const gamesBaseAPI = `${apiV1Endpoint}/${gamesResource}`;
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

    before(`Load default teams & games`, async () => {
        const teamService = await app.service(TeamService).getValue(app);
        await teamService._init();

        //*GAMES
        const gameService = await app.service(GameService).getValue(app);
        await gameService._init();
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

    describe('GET Method - List Games  (Root endpoint /games)', async () => {
        it('Should not list games without auth token', async () => {
            await client.get(gamesBaseAPI).expect(401);
        });
        it('Should list games', async () => {
            const res = await client.get(gamesBaseAPI).set('Authorization', adminAuthToken1).expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
        });
        it('Should list games with filter', async () => {
            const filter: Filter<Player> = { include: [{ relation: 'homeTeam' }, { relation: 'visitorTeam' }] };
            const res = await client
                .get(gamesBaseAPI)
                .set('Authorization', adminAuthToken1)
                .query({ filter: JSON.stringify(filter) })
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
            expect(res.body.data[0]).to.be.have.property('visitorTeam');
            expect(res.body.data[0]).to.be.have.property('homeTeam');
        });
    });
});
