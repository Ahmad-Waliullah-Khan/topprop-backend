import { Client } from '@loopback/testlab';
import { API_RESOURCES } from '@src/utils/constants';
import { TopPropBackendApplication } from '../..';
import { setupApplication } from './test-helper';

describe('User Controller', () => {
    let app: TopPropBackendApplication;
    let client: Client;
    const apiV1Endpoint = '/api/v1';
    const resource = API_RESOURCES.USERS;
    const baseAPI = `${apiV1Endpoint}/${resource}`;
    let adminAuthToken = 'Bearer ';
    let userAuthToken = 'Bearer ';
    let confirmUserAuthToken = '';
    let testUserId = 0;
    let adminId = 0;
    let forgotPasswordToken = '';

    before('setupApplication', async () => {
        ({ app, client } = await setupApplication());
    });

    after(async () => {
        await client.delete(`${baseAPI}/${adminId}`).set('Authorization', adminAuthToken);
        await app.stop();
    });

    describe('POST Method - Sign up Users', async () => {
        it('Should fail registering user without body', async () => {
            await client.post(`${baseAPI}/sign-up`).send({}).expect(400);
        });

        it('Should fail registering user without full name', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: '',
                    email: 'test-user@gb.com',
                    username: '@test-user1',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(400);
        });

        it('Should fail registering user without email', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: '',
                    username: '@test-user1',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(400);
        });
        it('Should fail registering user with and invalid email', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    username: '@test-user1',
                    email: 'email',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(400);
        });
        it('Should fail registering user without username', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: 'test-user@gb.com',
                    username: '',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(400);
        });
        it('Should fail registering user with and invalid username', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    username: 'invalid',
                    email: 'test-user@gb.com',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(400);
        });

        it('Should fail registering user without password', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: 'test-user@gb.com',
                    username: '@test-user1',
                    password: '',
                    confirmPassword: '1',
                })
                .expect(400);
        });

        it('Should fail registering user with and invalid password', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: 'test-user@gb.com',
                    username: '@test-user1',
                    password: '1',
                    confirmPassword: '1',
                })
                .expect(400);
        });
        it('Should fail registering user with and invalid confirm password', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: 'test-user@gb.com',
                    username: '@test-user1',
                    password: '12345678',
                    confirmPassword: '1',
                })
                .expect(400);
        });

        it('Should register user', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: 'test-user@gb.com',
                    username: '@test-user1',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(200);
        });
        it('Should not register a user with same email', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: 'test-user@gb.com',
                    username: '@test-user11',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(400);
        });
        it('Should not register a user with same username', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test full name',
                    email: 'test-user2@gb.com',
                    username: '@test-user1',
                    password: '12345678',
                    confirmPassword: '12345678',
                })
                .expect(400);
        });
    });

    describe(`POST Method - Login Users`, async () => {
        it('Should fail login as regular user. Bad password', async () => {
            await client
                .post(`${baseAPI}/login`)
                .send({
                    emailOrUsername: 'test-user@gb.com',
                    password: '123456780',
                })
                .expect(400);
        });
        it('Should fail login as regular user. Bad email or username', async () => {
            await client
                .post(`${baseAPI}/login`)
                .send({
                    emailOrUsername: 'test-user',
                    password: '12345678',
                })
                .expect(400);
        });
        it('Should login as user with email', async () => {
            let response = await client
                .post(`${baseAPI}/login`)
                .send({
                    emailOrUsername: 'test-user@gb.com',
                    password: '12345678',
                })
                .expect(200);
            userAuthToken += response.body.data;
        });
        it('Should login as user with username', async () => {
            let response = await client
                .post(`${baseAPI}/login`)
                .send({
                    emailOrUsername: '@test-user1',
                    password: '12345678',
                })
                .expect(200);
            userAuthToken = 'Bearer ';

            userAuthToken += response.body.data;
        });
        it('Should register admin', async () => {
            await client
                .post(`${baseAPI}/sign-up`)
                .send({
                    fullName: 'test',
                    email: process.env.ADMIN_EMAIL,
                    username: '@test-admin1',
                    password: 'Top.Prop10',
                    confirmPassword: 'Top.Prop10',
                })
                .expect(200);
        });
        it('Should login as admin with email', async () => {
            let response = await client
                .post(`${baseAPI}/admin-login`)
                .send({
                    emailOrUsername: process.env.ADMIN_EMAIL,
                    password: 'Top.Prop10',
                })
                .expect(200);
            adminAuthToken += response.body.data;
        });
        it('Should login as admin with username', async () => {
            let response = await client
                .post(`${baseAPI}/admin-login`)
                .send({
                    emailOrUsername: '@test-admin1',
                    password: 'Top.Prop10',
                })
                .expect(200);
            adminAuthToken = 'Bearer ';
            adminAuthToken += response.body.data;
        });
        it('Should not login admin in users endpoint', async () => {
            let response = await client
                .post(`${baseAPI}/login`)
                .send({
                    emailOrUsername: process.env.ADMIN_EMAIL,
                    password: 'Top.Prop10',
                })
                .expect(400);
        });
    });

    describe(`POST Method - Username validate endpoint`, async () => {
        it('should not validate a username without username provided', async () => {
            let response = await client
                .post(`${baseAPI}/username/validate`)
                .send({
                    username: '',
                })
                .expect(400);
        });
        it('should not validate a username without body', async () => {
            let response = await client.post(`${baseAPI}/username/validate`).expect(422);
        });
        it('should not validate an invalid username', async () => {
            let response = await client
                .post(`${baseAPI}/username/validate`)
                .send({
                    username: '@very-very-very-long-test-username-aaaaaaaaaaaaaa',
                })
                .expect(400);
        });
        it('should validate a username', async () => {
            let response = await client
                .post(`${baseAPI}/username/validate`)
                .send({
                    username: '@test-username',
                })
                .expect(200);
        });
        // it('should not generate a username without an email provided', async () => {
        //     let response = await client
        //         .post(`${baseAPI}/username/generate`)
        //         .send({
        //             emailOrUsername: '',
        //         })
        //         .expect(400);
        // });
        // it('should not generate a username without body', async () => {
        //     let response = await client.post(`${baseAPI}/username/generate`).expect(422);
        // });
        // it('should not generate a username with an invalid email', async () => {
        //     let response = await client
        //         .post(`${baseAPI}/username/generate`)
        //         .send({
        //             emailOrUsername: 'invalid',
        //         })
        //         .expect(400);
        // });
        // it('should generate a username', async () => {
        //     let response = await client
        //         .post(`${baseAPI}/username/generate`)
        //         .send({
        //             emailOrUsername: 'test-email@gb.com',
        //         })
        //         .expect(200);
        // });
    });

    describe(`POST Method - Forgot Password`, async () => {
        it('Should fail requesting reset password without body', async () => {
            await client
                .patch(`${baseAPI}/forgot-password`)
                .send({
                    email: '',
                })
                .expect(400);
        });

        it('Should fail requesting reset password with invalid email', async () => {
            await client
                .patch(`${baseAPI}/forgot-password`)
                .send({
                    email: 'invalidEmail',
                })
                .expect(400);
        });

        it('Should request reset password for regular user', async () => {
            await client
                .patch(`${baseAPI}/forgot-password`)
                .send({
                    email: 'test-user@gb.com',
                })
                .expect(200);
        });

        it('Should fail requesting reset password with a request already sent', async () => {
            await client
                .patch(`${baseAPI}/forgot-password`)
                .send({
                    email: 'test-user@gb.com',
                })
                .expect(429);
        });

        it('Should list one user by filters to reset the password', async () => {
            let response = await client
                .get(baseAPI)
                .set('Authorization', adminAuthToken)
                .query({ 'filter[where][email]': 'test-user@gb.com' })
                .expect(200);

            forgotPasswordToken = response.body.data[0].forgotPasswordToken;
        });
    });
    describe(`POST Method - Reset Password`, async () => {
        it('Should fail resetting password with empty body', async () => {
            await client
                .patch(`${baseAPI}/reset-password`)
                .send({
                    password: '',
                    confirmPassword: '',
                    forgotPasswordToken: '',
                })
                .expect(400);
        });

        it('Should fail resetting password with invalid forgot password token', async () => {
            await client
                .patch(`${baseAPI}/reset-password`)
                .send({
                    password: '',
                    confirmPassword: '',
                    forgotPasswordToken: 'invalid',
                })
                .expect(400);
        });

        it('Should fail resetting password with invalid password', async () => {
            await client
                .patch(`${baseAPI}/reset-password`)
                .send({
                    password: 'pass',
                    confirmPassword: 'pass',
                    forgotPasswordToken,
                })
                .expect(400);
        });

        it('Should fail resetting password with invalid confirm password', async () => {
            await client
                .patch(`${baseAPI}/reset-password`)
                .send({
                    password: 'Testing1',
                    confirmPassword: 'pass',
                    forgotPasswordToken,
                })
                .expect(400);
        });

        it('Should reset password successfully', async () => {
            await client
                .patch(`${baseAPI}/reset-password`)
                .send({
                    password: 'Testing1',
                    confirmPassword: 'Testing1',
                    forgotPasswordToken,
                })
                .expect(200);
        });
    });

    describe('GET Method - List Users', async () => {
        it('Should fail listing user without auth token', async () => {
            await client.get(baseAPI).expect(401);
        });

        it('Should list users', async () => {
            await client.get(baseAPI).set('Authorization', adminAuthToken).expect(200);
        });

        it('Should list one user by filters', async () => {
            let response = await client
                .get(baseAPI)
                .set('Authorization', adminAuthToken)
                .query({ 'filter[where][email]': 'test-user@gb.com' })
                .expect(200);

            testUserId = response.body.data[0].id;
            confirmUserAuthToken += response.body.data[0].confirmAccountToken;
        });

        it('Should list one admin user by filters', async () => {
            let response = await client
                .get(baseAPI)
                .set('Authorization', adminAuthToken)
                .query({ 'filter[where][email]': process.env.ADMIN_EMAIL })
                .expect(200);

            adminId = response.body.data[0].id;
        });
    });

    // describe('GET Method - Retrieve User App Settings', async () => {
    //     it('Should fail listing user without auth token', async () => {
    //         await client.get(`${baseAPI}/${testUserId}/app-settings`).expect(401);
    //     });

    //     it('Should list users', async () => {
    //         const res = await client
    //             .get(`${baseAPI}/${testUserId}/app-settings`)
    //             .set('Authorization', userAuthToken)
    //             .expect(200);
    //         expect(res).to.have.property('body');
    //         expect(res.body).to.have.property('data');
    //         expect(res.body.data).to.have.property('id');
    //         expect(res.body.data).to.have.property('acceptAutomaticallyTrips');
    //         expect(res.body.data.acceptAutomaticallyTrips).to.be.true;
    //         expect(res.body.data).to.have.property('automaticallyTripsDisabledAt');
    //         expect(res.body.data.automaticallyTripsDisabledAt).to.be.null;
    //     });
    // });

    // describe('PATCH Method - Toggle Automatic Trip - App Settings', async () => {
    //     it('Should not update app settings without auth token', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/app-settings/toggle-automatic-trips`).expect(401);
    //     });

    //     it('Should update app settings', async () => {
    //         const res = await client
    //             .patch(`${baseAPI}/${testUserId}/app-settings/toggle-automatic-trips`)
    //             .set('Authorization', userAuthToken)
    //             .expect(204);
    //     });
    // });

    // describe('PATCH Method - Update Users', async () => {
    //     it('Should fail setting address without auth token', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/set-address`).send({ address: null }).expect(401);
    //     });

    //     it('Should fail setting address wit invalid userId', async () => {
    //         await client.patch(`${baseAPI}/invalid/set-address`).send({ address: null }).expect(400);
    //     });

    //     it('Should fail setting address with empty body', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({ address: null })
    //             .expect(400);
    //     });

    //     it('Should fail setting address with missing street 1 ', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 address: {
    //                     street1: '',
    //                     street2: '2',
    //                     city: 'Los Angeles',
    //                     state: 'California',
    //                     zip: '90212',
    //                     country: 'US',
    //                 },
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail setting address with missing city ', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 address: {
    //                     street1: 'street 1',
    //                     street2: '2',
    //                     city: '',
    //                     state: 'California',
    //                     zip: '90212',
    //                     country: 'US',
    //                 },
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail setting address with missing state ', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 address: {
    //                     street1: 'street 1',
    //                     street2: '2',
    //                     city: 'LA',
    //                     state: '',
    //                     zip: '90212',
    //                     country: 'US',
    //                 },
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail setting address with missing zip ', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 address: {
    //                     street1: 'street 1',
    //                     street2: '2',
    //                     city: 'LA',
    //                     state: 'CA',
    //                     zip: '',
    //                     country: 'US',
    //                 },
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail setting address with wrong zip ', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 address: {
    //                     street1: 'street 1',
    //                     street2: '2',
    //                     city: 'LA',
    //                     state: 'CA',
    //                     zip: '1234',
    //                     country: 'US',
    //                 },
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail setting address with missing country ', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 address: {
    //                     street1: 'street 1',
    //                     street2: '2',
    //                     city: 'LA',
    //                     state: 'CA',
    //                     zip: '90212',
    //                     country: '',
    //                 },
    //             })
    //             .expect(400);
    //     });

    //     // it('Should fail setting address with missing latitude ', async () => {
    //     //     await client
    //     //         .patch(`${baseAPI}/${testUserId}/set-address`)
    //     //         .set('Authorization', userAuthToken)
    //     //         .send({
    //     //             address: {
    //     //                 street1: 'street 1',
    //     //                 street2: '2',
    //     //                 city: 'LA',
    //     //                 state: 'CA',
    //     //                 zip: '90212',
    //     //                 country: 'US',
    //     //                 latitude: '',
    //     //                 longitude: 100,
    //     //             },
    //     //         })
    //     //         .expect(400);
    //     // });

    //     // it('Should fail setting address with wrong latitude type', async () => {
    //     //     await client
    //     //         .patch(`${baseAPI}/${testUserId}/set-address`)
    //     //         .set('Authorization', userAuthToken)
    //     //         .send({
    //     //             address: {
    //     //                 street1: 'street 1',
    //     //                 street2: '2',
    //     //                 city: 'LA',
    //     //                 state: 'CA',
    //     //                 zip: '90212',
    //     //                 country: 'US',
    //     //                 latitude: 'string',
    //     //                 longitude: 100,
    //     //             },
    //     //         })
    //     //         .expect(400);
    //     // });

    //     // it('Should fail setting address with missing longitude ', async () => {
    //     //     await client
    //     //         .patch(`${baseAPI}/${testUserId}/set-address`)
    //     //         .set('Authorization', userAuthToken)
    //     //         .send({
    //     //             address: {
    //     //                 street1: 'street 1',
    //     //                 street2: '2',
    //     //                 city: 'LA',
    //     //                 state: 'CA',
    //     //                 zip: '90212',
    //     //                 country: 'US',
    //     //                 longitude: '',
    //     //                 latitude: 100,
    //     //             },
    //     //         })
    //     //         .expect(400);
    //     // });

    //     // it('Should fail setting address with wrong longitude type', async () => {
    //     //     await client
    //     //         .patch(`${baseAPI}/${testUserId}/set-address`)
    //     //         .set('Authorization', userAuthToken)
    //     //         .send({
    //     //             address: {
    //     //                 street1: 'street 1',
    //     //                 street2: '2',
    //     //                 city: 'LA',
    //     //                 state: 'CA',
    //     //                 zip: '90212',
    //     //                 country: 'US',
    //     //                 longitude: 'string',
    //     //                 latitude: 100,
    //     //             },
    //     //         })
    //     //         .expect(400);
    //     // });

    //     it('Should set address successfully', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/set-address`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 address: {
    //                     street1: 'street 1',
    //                     street2: '2',
    //                     city: 'LA',
    //                     state: 'CA',
    //                     zip: '84121',
    //                     country: 'US',
    //                     longitude: 100,
    //                     latitude: 100,
    //                 },
    //             })
    //             .expect(200);
    //     });
    //     it('Should login as user', async () => {
    //         let response = await client
    //             .post(`${baseAPI}/login`)
    //             .send({
    //                 email: 'test-user@gb.com',
    //                 password: '12345678',
    //             })
    //             .expect(200);
    //         userAuthToken = `Bearer ${response.body.data}`;
    //     });

    //     it('Should fail updating test user without auth token', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}`).send({}).expect(401);
    //     });

    //     it('Should fail updating test user without body', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}`).set('Authorization', userAuthToken).send({}).expect(400);
    //     });
    //     it('Should fail updating test user without full name', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}`)
    //             .set('Authorization', userAuthToken)
    //             .send({ fullName: '' })
    //             .expect(400);
    //     });
    //     it('Should fail updating test user without email', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}`)
    //             .set('Authorization', userAuthToken)
    //             .send({ fullName: 'full name', email: '' })
    //             .expect(400);
    //     });
    //     it('Should fail updating test user without username', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}`)
    //             .set('Authorization', userAuthToken)
    //             .send({ fullName: 'full name', email: 'test@gb.com', username: '' })
    //             .expect(400);
    //     });
    //     it('Should fail updating test user with a taken username', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}`)
    //             .set('Authorization', userAuthToken)
    //             .send({ fullName: 'full name', email: 'test@gb.com', username: '@test-admin1' })
    //             .expect(400);
    //     });
    //     it('Should fail updating user with email already used the test user', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}`)
    //             .set('Authorization', userAuthToken)
    //             .send({ fullName: 'full name', email: process.env.ADMIN_EMAIL, username: '@test-user1' })
    //             .expect(400);
    //     });
    //     it('Should update successfully the test user', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}`)
    //             .set('Authorization', userAuthToken)
    //             .send({ fullName: 'full name', email: 'test-user2@gb.com', username: '@test-user2' })
    //             .expect(200);
    //     });
    //     it('Should update successfully the test user', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}`)
    //             .set('Authorization', userAuthToken)
    //             .send({ fullName: 'full name', email: 'test-user@gb.com', username: '@test-user1' })
    //             .expect(200);
    //     });

    //     it('Should fail confirm test without auth token', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/confirm-account`).send({}).expect(401);
    //     });

    //     it('Should fail confirm test with invalid user id', async () => {
    //         await client.patch(`${baseAPI}/invalidId/confirm-account`).send({}).expect(400);
    //     });

    //     it('Should fail confirm test user without confirm token', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/confirm-account`)
    //             .set('Authorization', userAuthToken)
    //             .send({ confirmAccountToken: null })
    //             .expect(400);
    //     });

    //     it('Should fail confirm test user with wrong token.', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/confirm-account`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 confirmAccountToken: '123456',
    //             })
    //             .expect(406);
    //     });

    //     it('Should fail confirm test user with bad formatted token.', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/confirm-account`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 confirmAccountToken: 'bad formatted',
    //             })
    //             .expect(400);
    //     });

    //     it('Should confirm test user', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/confirm-account`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 confirmAccountToken: confirmUserAuthToken,
    //             })
    //             .expect(200);
    //     });

    //     it('Should fail confirm test user. Already confirmed', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/confirm-account`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 confirmAccountToken: confirmUserAuthToken,
    //             })
    //             .expect(406);
    //     });

    //     it('Should not resend confirm token. Without auth token', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/resend-confirm-token`).expect(401);
    //     });

    //     it('Should not resend confirm token. Already confirmed', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/resend-confirm-token`)
    //             .set('Authorization', userAuthToken)
    //             .expect(406);
    //     });

    //     it('Should not resend confirm token. Un existing user', async () => {
    //         await client.patch(`${baseAPI}/999/resend-confirm-token`).set('Authorization', userAuthToken).expect(404);
    //     });

    //     it('Should fail accepting TOS without auth token', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/accept-tos`).expect(401);
    //     });

    //     it('Should fail accepting TOS with invalid userId', async () => {
    //         await client.patch(`${baseAPI}/invalid/accept-tos`).set('Authorization', userAuthToken).expect(400);
    //     });

    //     it('Should accept TOS for test user', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/accept-tos`).set('Authorization', userAuthToken).expect(200);
    //     });

    //     it('Should fail accepting TOS for test user. Already accepted', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/accept-tos`).set('Authorization', userAuthToken).expect(406);
    //     });

    //     it('Should fail requesting reset password without body', async () => {
    //         await client
    //             .patch(`${baseAPI}/forgot-password`)
    //             .send({
    //                 email: '',
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail requesting reset password with invalid email', async () => {
    //         await client
    //             .patch(`${baseAPI}/forgot-password`)
    //             .send({
    //                 email: 'invalidEmail',
    //             })
    //             .expect(400);
    //     });

    //     it('Should request reset password for regular user', async () => {
    //         await client
    //             .patch(`${baseAPI}/forgot-password`)
    //             .send({
    //                 email: 'test-user@gb.com',
    //             })
    //             .expect(200);
    //     });

    //     it('Should fail requesting reset password with a request already sent', async () => {
    //         await client
    //             .patch(`${baseAPI}/forgot-password`)
    //             .send({
    //                 email: 'test-user@gb.com',
    //             })
    //             .expect(429);
    //     });
    //     it('Should list one user by filters to reset the password', async () => {
    //         let response = await client
    //             .get(baseAPI)
    //             .set('Authorization', adminAuthToken)
    //             .query({ 'filter[where][email]': 'test-user@gb.com' })
    //             .expect(200);

    //         forgotPasswordToken = response.body.data[0].forgotPasswordToken;
    //     });

    //     it('Should fail resetting password with empty body', async () => {
    //         await client
    //             .patch(`${baseAPI}/reset-password`)
    //             .send({
    //                 password: '',
    //                 confirmPassword: '',
    //                 forgotPasswordToken: '',
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail resetting password with invalid forgot password token', async () => {
    //         await client
    //             .patch(`${baseAPI}/reset-password`)
    //             .send({
    //                 password: '',
    //                 confirmPassword: '',
    //                 forgotPasswordToken: 'invalid',
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail resetting password with invalid password', async () => {
    //         await client
    //             .patch(`${baseAPI}/reset-password`)
    //             .send({
    //                 password: 'pass',
    //                 confirmPassword: 'pass',
    //                 forgotPasswordToken,
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail resetting password with invalid confirm password', async () => {
    //         await client
    //             .patch(`${baseAPI}/reset-password`)
    //             .send({
    //                 password: 'Testing1',
    //                 confirmPassword: 'pass',
    //                 forgotPasswordToken,
    //             })
    //             .expect(400);
    //     });

    //     it('Should reset password successfully', async () => {
    //         await client
    //             .patch(`${baseAPI}/reset-password`)
    //             .send({
    //                 password: 'Testing1',
    //                 confirmPassword: 'Testing1',
    //                 forgotPasswordToken,
    //             })
    //             .expect(200);
    //     });

    //     it('Should fail changing password without auth token', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/change-password`)
    //             .send({
    //                 password: '',
    //                 confirmPassword: '',
    //             })
    //             .expect(401);
    //     });

    //     it('Should fail changing password with invalid userId', async () => {
    //         await client
    //             .patch(`${baseAPI}/invalid/change-password`)
    //             .send({
    //                 password: '',
    //                 confirmPassword: '',
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail changing password with empty body', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/change-password`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 password: '',
    //                 confirmPassword: '',
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail changing password with invalid forgot password token', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/change-password`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 password: '',
    //                 confirmPassword: '',
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail changing password with invalid password', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/change-password`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 password: 'pass',
    //                 confirmPassword: 'pass',
    //             })
    //             .expect(400);
    //     });

    //     it('Should fail changing password with invalid confirm password', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/change-password`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 password: 'Testing1',
    //                 confirmPassword: 'pass',
    //             })
    //             .expect(400);
    //     });

    //     it('Should change password successfully', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/change-password`)
    //             .set('Authorization', userAuthToken)
    //             .send({
    //                 password: 'Testing1',
    //                 confirmPassword: 'Testing1',
    //             })
    //             .expect(200);
    //     });

    //     it('Should fail renewing token without auth token', async () => {
    //         await client
    //             .patch(`${baseAPI}/${testUserId}/renew-token`)
    //             // .set('Authorization', userAuthToken)
    //             .expect(401);
    //     });

    //     it('Should fail renewing token with invalid user id', async () => {
    //         await client.patch(`${baseAPI}/invalid/renew-token`).set('Authorization', userAuthToken).expect(400);
    //     });

    //     it('Should renew token successfully', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/renew-token`).set('Authorization', userAuthToken).expect(200);
    //     });

    //     it('Should fail archiving user without auth token', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/archive`).expect(401);
    //     });

    //     it('Should fail archiving user without permission', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/archive`).set('Authorization', userAuthToken).expect(403);
    //     });

    //     it('Should archive user successfully', async () => {
    //         await client.patch(`${baseAPI}/${testUserId}/archive`).set('Authorization', adminAuthToken).expect(200);
    //     });
    // });

    describe('DELETE Method - Delete Users', async () => {
        it('Should delete test user', async () => {
            await client.delete(`${baseAPI}/${testUserId}`).set('Authorization', adminAuthToken).expect(204);
        });
    });
});
