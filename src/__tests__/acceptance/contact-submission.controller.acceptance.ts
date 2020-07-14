import { Filter } from '@loopback/repository';
import { Client, expect } from '@loopback/testlab';
import { ContactSubmission } from '@src/models';
import { API_RESOURCES } from '@src/utils/constants';
import { TopPropBackendApplication } from '../..';
import { setupApplication } from './test-helper';

describe('Contact Submission Controller', () => {
    let app: TopPropBackendApplication;
    let client: Client;
    const apiV1Endpoint = '/api/v1';
    const contactSubmissionResource = API_RESOURCES.CONTACT_SUBMISSIONS;
    const userResource = API_RESOURCES.USERS;
    const contactSubmissionsBaseAPI = `${apiV1Endpoint}/${contactSubmissionResource}`;
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

    after(async () => {
        let contactSubmissions = await client.get(contactSubmissionsBaseAPI).set('Authorization', adminAuthToken1);
        console.log('Removing all contact submissions...');
        for (let index = 0; index < contactSubmissions.body.data.length; index++) {
            const contactSubmission = contactSubmissions.body.data[index];
            await client
                .delete(`${contactSubmissionsBaseAPI}/${contactSubmission.id}`)
                .set('Authorization', adminAuthToken1);
        }

        let users = await client.get(`${usersBaseAPI}`).set('Authorization', adminAuthToken1);
        console.log('Removing all users...');
        for (let index = 0; index < users.body.data.length; index++) {
            const user = users.body.data[index];
            await client.delete(`${usersBaseAPI}/${user.id}`).set('Authorization', adminAuthToken1);
        }
        await app.stop();
    });

    describe('POST Method - Create Contact Submissions (Root endpoint /contact-submissions)', async () => {
        it('Should not create contact submission without token', async () => {
            await client
                .post(`${contactSubmissionsBaseAPI}`)
                .send({ message: 'This is a test contact message for the top prop project.', userId: testUserId1 })
                .expect(401);
        });
        it('Should not create contact submission without body', async () => {
            await client.post(`${contactSubmissionsBaseAPI}`).set('Authorization', adminAuthToken1).expect(422);
        });

        it('Should not create contact submission without message', async () => {
            await client
                .post(`${contactSubmissionsBaseAPI}`)
                .set('Authorization', adminAuthToken1)
                .send({
                    /* message: 'This is a test contact message for the top prop project.', */ userId: testUserId1,
                })
                .expect(400);
        });
        it('Should not create contact submission without user id', async () => {
            await client
                .post(`${contactSubmissionsBaseAPI}`)
                .set('Authorization', adminAuthToken1)
                .send({
                    message: 'This is a test contact message for the top prop project.' /*  userId: testUserId1, */,
                })
                .expect(400);
        });
        it('Should create contact submission', async () => {
            const res = await client
                .post(`${contactSubmissionsBaseAPI}`)
                .set('Authorization', adminAuthToken1)
                .send({
                    message: 'This is a test contact message for the top prop project.',
                    userId: testUserId1,
                })
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.property('id');
            testContactSubmissionId1 = res.body.data.id;
        });
    });

    describe('POST Method - Create Contact Submissions (Users endpoint /users/{id}/contact-submissions)', async () => {
        it('Should not create contact submission without token', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/contact-submissions`)
                .send({ message: 'This is a test contact message for the top prop project.' })
                .expect(401);
        });
        it('Should not create contact submission without body', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/contact-submissions`)
                .set('Authorization', userAuthToken1)
                .expect(422);
        });

        it('Should not create contact submission without message', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/contact-submissions`)
                .set('Authorization', userAuthToken1)
                .send({})
                .expect(422);
        });

        it('Should create contact submission', async () => {
            const res = await client
                .post(`${usersBaseAPI}/${testUserId1}/contact-submissions`)
                .set('Authorization', userAuthToken1)
                .send({
                    message: 'This is a test contact message for the top prop project.',
                })
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.property('id');
            testContactSubmissionId2 = res.body.data.id;
        });
    });

    describe('GET Method - List Contact Submissions  (Root endpoint /contact-submissions)', async () => {
        it('Should not list contact submissions without auth token', async () => {
            await client.get(contactSubmissionsBaseAPI).expect(401);
        });
        it('Should list contact submissions', async () => {
            const res = await client.get(contactSubmissionsBaseAPI).set('Authorization', adminAuthToken1).expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
        });
        it('Should list contact submissions with filter', async () => {
            const filter: Filter<ContactSubmission> = { include: [{ relation: 'user' }] };
            const res = await client
                .get(contactSubmissionsBaseAPI)
                .set('Authorization', adminAuthToken1)
                .query({ filter: JSON.stringify(filter) })
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
            expect(res.body.data[0]).to.be.have.property('user');
        });
    });

    describe('GET Method - List Contact Submissions (Users endpoint /users/{id}/contact-submissions)', async () => {
        it('Should not list contact submissions without auth token', async () => {
            await client.get(`${usersBaseAPI}/${testUserId1}/contact-submissions`).expect(401);
        });
        it('Should list contact submissions', async () => {
            const res = await client
                .get(`${usersBaseAPI}/${testUserId1}/contact-submissions`)
                .set('Authorization', adminAuthToken1)
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
        });
    });

    describe('PATCH Method - Read Contact Submission', async () => {
        it('Should not read contact submission without token', async () => {
            await client.patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/read`).expect(401);
        });
        it('Should not read contact submission as user', async () => {
            await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/read`)
                .set('Authorization', userAuthToken1)
                .expect(403);
        });

        it('Should read contact submission', async () => {
            const res = await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/read`)
                .set('Authorization', adminAuthToken1)
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.property('id');
        });
        it('Should read contact submission again ', async () => {
            await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/read`)
                .set('Authorization', adminAuthToken1)
                .expect(406);
        });
    });

    describe('PATCH Method - Unread Contact Submission', async () => {
        it('Should not unread contact submission without token', async () => {
            await client.patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/unread`).expect(401);
        });
        it('Should not unread contact submission as user', async () => {
            await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/unread`)
                .set('Authorization', userAuthToken1)
                .expect(403);
        });

        it('Should unread contact submission', async () => {
            const res = await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/unread`)
                .set('Authorization', adminAuthToken1)
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.property('id');
        });
        it('Should unread contact submission again ', async () => {
            const res = await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/unread`)
                .set('Authorization', adminAuthToken1)
                .expect(406);
        });
    });

    describe('PATCH Method - Reply Contact Submission', async () => {
        it('Should not reply contact submission without token', async () => {
            await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/reply`)
                .send({
                    message: 'This is a test contact message for the top prop project.',
                })
                .expect(401);
        });
        it('Should not reply contact submission as user', async () => {
            await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/reply`)
                .set('Authorization', userAuthToken1)
                .send({
                    message: 'This is a test contact message for the top prop project.',
                })
                .expect(403);
        });

        it('Should not reply contact submission without body', async () => {
            await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/reply`)
                .set('Authorization', adminAuthToken1)
                .expect(422);
        });

        it('Should reply contact submission', async () => {
            const res = await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/reply`)
                .set('Authorization', adminAuthToken1)
                .send({
                    message: 'This is a test contact message for the top prop project.',
                })
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.property('id');
        });
        it('Should reply contact submission again ', async () => {
            await client
                .patch(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}/reply`)
                .set('Authorization', adminAuthToken1)
                .send({
                    message: 'This is a test contact message for the top prop project.',
                })
                .expect(406);
        });
    });

    describe('DELETE Method - Delete Contact Submissions', async () => {
        it('Should not delete test contact submissions as user', async () => {
            await client
                .delete(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}`)
                .set('Authorization', userAuthToken1)
                .expect(403);
        });
        it('Should delete test contact submissions as admin', async () => {
            await client
                .delete(`${contactSubmissionsBaseAPI}/${testContactSubmissionId1}`)
                .set('Authorization', adminAuthToken1)
                .expect(204);
        });
    });
});
