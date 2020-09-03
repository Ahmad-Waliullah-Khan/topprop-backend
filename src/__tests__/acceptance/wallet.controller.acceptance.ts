import { Client, expect } from '@loopback/testlab';
import { API_RESOURCES, MINIMUM_BET_AMOUNT } from '@src/utils/constants';
import { TopPropBackendApplication } from '../..';
import { setupApplication } from './test-helper';

describe('Wallet Controller', () => {
    let app: TopPropBackendApplication;
    let client: Client;
    const apiV1Endpoint = '/api/v1';

    const userResource = API_RESOURCES.USERS;
    const usersBaseAPI = `${apiV1Endpoint}/${userResource}`;

    let adminAuthToken1 = 'Bearer ';
    let userAuthToken1 = 'Bearer ';
    let userAuthToken2 = 'Bearer ';
    let testUserId1 = 0;
    let testUserId2 = 0;
    let adminId1 = 0;

    let defaultPaymentMethod = '';
    let secondPaymentMethod = '';
    let thirdPaymentMethod = '';

    before('setupApplication', async () => {
        ({ app, client } = await setupApplication());
    });
    before('Prepare test users', async () => {
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

        //Sign up user 2
        const userSignupRes2 = await client.post(`${usersBaseAPI}/sign-up`).send({
            fullName: 'test full name 2',
            email: 'test-user2@gb.com',
            username: '@test-user2',
            password: '12345678',
            confirmPassword: '12345678',
        });

        testUserId2 = userSignupRes2.body.user.id;
        userAuthToken2 += userSignupRes2.body.data;

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

    after('Delete all test users', async () => {
        let users = await client.get(`${usersBaseAPI}`).set('Authorization', adminAuthToken1);
        for (let index = 0; index < users.body.data.length; index++) {
            const user = users.body.data[index];
            await client.delete(`${usersBaseAPI}/${user.id}`).set('Authorization', adminAuthToken1);
        }
        await app.stop();
    });

    describe('POST Method - Create Wallet (Add Payment Method)', async () => {
        it('Should fail creating a payment method without auth token', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`)
                .send({ paymentMethodToken: 'token_visa' })
                .expect(401);
        });
        it('Should fail creating a payment method without body', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`)
                .set('Authorization', userAuthToken1)
                .send({})
                .expect(400);
        });
        it('Should fail creating a payment method without paymentMethodToken', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`)
                .set('Authorization', userAuthToken1)
                .send({ paymentMethodToken: '' })
                .expect(400);
        });
        it('Should fail creating a payment method with invalid paymentMethodToken', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`)
                .set('Authorization', userAuthToken1)
                .send({ paymentMethodToken: 5 })
                .expect(400);
        });
        it('Should create a payment method successfully', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`)
                .set('Authorization', userAuthToken1)
                .send({ paymentMethodToken: 'tok_mastercard' })
                .expect(200);
        });
        it('Should create a payment method successfully for user 2', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId2}/wallet/payment-methods`)
                .set('Authorization', userAuthToken2)
                .send({ paymentMethodToken: 'tok_mastercard' })
                .expect(200);
        });
    });

    describe('GET Method - List Wallet (Payment methods)', async () => {
        it('Should fail fetching wallet without auth token', async () => {
            await client.get(`${usersBaseAPI}/${testUserId1}/wallet`).expect(401);
        });
        it('Should fail fetching wallet for a non existing user', async () => {
            await client.get(`${usersBaseAPI}/${1000}/wallet`).set('Authorization', adminAuthToken1).expect(404);
        });
        it('Should fail fetching wallet for a user who does not have stripe account', async () => {
            await client.get(`${usersBaseAPI}/${adminId1}/wallet`).set('Authorization', adminAuthToken1).expect(200);
        });
        it('Should fetch wallet for a test user to get the default payment method', async () => {
            let walletResponse = await client
                .get(`${usersBaseAPI}/${testUserId1}/wallet`)
                .set('Authorization', userAuthToken1)
                .expect(200);
            defaultPaymentMethod = walletResponse.body.data.invoice_settings.default_payment_method;
        });
        it('Should fetch wallet for a test user 2 to get the default payment method', async () => {
            let walletResponse = await client
                .get(`${usersBaseAPI}/${testUserId2}/wallet`)
                .set('Authorization', userAuthToken2)
                .expect(200);
            thirdPaymentMethod = walletResponse.body.data.invoice_settings.default_payment_method;
        });
        it('Should create a 2nd payment method successfully', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`)
                .set('Authorization', userAuthToken1)
                .send({ paymentMethodToken: 'tok_mastercard' })
                .expect(200);
        });
        it('Should fetch wallet for a test user to get the 2nd payment method', async () => {
            let walletResponse = await client
                .get(`${usersBaseAPI}/${testUserId1}/wallet`)
                .set('Authorization', userAuthToken1)
                .expect(200);
            secondPaymentMethod = walletResponse.body.data.invoice_settings.default_payment_method;
        });
    });

    describe('GET Method - List Payment methods', async () => {
        it('Should fail fetching payment methods without auth token', async () => {
            await client.get(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`).expect(401);
        });
        it('Should fetch payment methods for a non existing user', async () => {
            await client
                .get(`${usersBaseAPI}/${1000}/wallet/payment-methods`)
                .set('Authorization', adminAuthToken1)
                .expect(404);
        });

        it('Should fail fetching payment methods for a user who does not have stripe account', async () => {
            const res = await client
                .get(`${usersBaseAPI}/${adminId1}/wallet/payment-methods`)
                .set('Authorization', adminAuthToken1)
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.an.Array;
            expect(res.body.data).to.have.lengthOf(0);
        });

        it('Should fetch payment methods for a test user to get the default payment method', async () => {
            let walletResponse = await client
                .get(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods`)
                .set('Authorization', userAuthToken1)
                .expect(200);
        });
        it('Should fetch payment methods for a test user 2 to get the default payment method', async () => {
            let walletResponse = await client
                .get(`${usersBaseAPI}/${testUserId2}/wallet/payment-methods`)
                .set('Authorization', userAuthToken2)
                .expect(200);
        });
    });

    describe('PATCH Method - Update Wallet (Payment methods)', async () => {
        it('Should fail changing default payment method without auth token', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/${secondPaymentMethod}/default`)
                // .set('Authorization', adminAuthToken)
                .expect(401);
        });
        it('Should fail changing default payment method for a user who does not have stripe account', async () => {
            await client
                .patch(`${usersBaseAPI}/${adminId1}/wallet/payment-methods/${secondPaymentMethod}/default`)
                .set('Authorization', userAuthToken1)
                .expect(404);
        });

        it('Should fail changing the default payment method for the same', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/${secondPaymentMethod}/default`)
                .set('Authorization', userAuthToken1)
                .expect(406);
        });
        it('Should fail changing the default payment method for and invalid one', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/invalid/default`)
                .set('Authorization', userAuthToken1)
                .expect(400);
        });
        it('Should change the default payment method test user', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/${defaultPaymentMethod}/default`)
                .set('Authorization', userAuthToken1)
                .expect(200);
        });
    });

    describe('PATCH Method - Update Wallet (Detach payment methods)', async () => {
        it('Should fail detaching payment method without token', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/${defaultPaymentMethod}/detach`)
                //.set('Authorization', userAuthToken)
                .expect(401);
        });

        it('Should fail detaching payment method for a user who does not have stripe account', async () => {
            await client
                .patch(
                    `${usersBaseAPI}/${adminId1}/${testUserId1}/wallet/payment-methods/${secondPaymentMethod}/detach`,
                )
                .set('Authorization', adminAuthToken1)
                .expect(404);
        });

        it('Should fail detaching the default payment method', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/${defaultPaymentMethod}/detach`)
                .set('Authorization', userAuthToken1)
                .expect(406);
        });

        it('Should fail detaching the default payment method', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/${defaultPaymentMethod}/detach`)
                .set('Authorization', userAuthToken1)
                .expect(406);
        });

        it('Should detach 2nd payment method', async () => {
            await client
                .patch(`${usersBaseAPI}/${testUserId1}/wallet/payment-methods/${secondPaymentMethod}/detach`)
                .set('Authorization', userAuthToken1)
                .expect(200);
        });
    });

    describe('POST Method - Calculate Net Amount', async () => {
        it('Should fail calculate net amount without auth token', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/calculate-net-amount`)
                //.set('Authorization', userAuthToken)
                .send({ amount: MINIMUM_BET_AMOUNT })
                .expect(401);
        });

        it('Should fail calculate net amount without body', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/calculate-net-amount`)
                .set('Authorization', adminAuthToken1)
                .expect(422);
        });
        it('Should fail calculate net amount with an invalid amount (invalid type)', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/calculate-net-amount`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: 'test' })
                .expect(400);
        });
        it('Should fail calculate net amount with an invalid amount (less than 10) ', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/calculate-net-amount`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: 500 })
                .expect(400);
        });
        it('Should calculate net amount', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/calculate-net-amount`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: MINIMUM_BET_AMOUNT })
                .expect(200);
        });
    });
    describe('POST Method - Add Funds', async () => {
        it('Should fail add funds without auth token', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/add`)
                //.set('Authorization', userAuthToken)
                .send({ amount: MINIMUM_BET_AMOUNT })
                .expect(401);
        });

        it('Should fail add funds without body', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/add`)
                .set('Authorization', adminAuthToken1)
                .expect(422);
        });
        it('Should fail add funds with an invalid amount (invalid type)', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/add`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: 'test' })
                .expect(400);
        });
        it('Should fail add funds with an invalid amount (less than 10)', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/add`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: 500 })
                .expect(400);
        });
        it('Should add funds', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/add`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: MINIMUM_BET_AMOUNT })
                .expect(200);
        });
        it('Should not add funds with and invalid payment method', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/add`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: MINIMUM_BET_AMOUNT, paymentMethod: 'invalid' })
                .expect(404);
        });
        it('Should not add funds with a payment method that does not belong to the user', async () => {
            await client
                .post(`${usersBaseAPI}/${testUserId1}/wallet/funds/add`)
                .set('Authorization', adminAuthToken1)
                .send({ amount: MINIMUM_BET_AMOUNT, paymentMethod: thirdPaymentMethod })
                .expect(400);
        });
    });

    describe('GET Method - Get Funds', async () => {
        it('Should fail getting funds without auth token', async () => {
            await client
                .get(`${usersBaseAPI}/${testUserId1}/wallet/funds/retrieve`)
                //.set('Authorization', userAuthToken)
                .expect(401);
        });

        it('Should get user 1 funds', async () => {
            const res = await client
                .get(`${usersBaseAPI}/${testUserId1}/wallet/funds/retrieve`)
                .set('Authorization', userAuthToken1)
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.Number;
            expect(res.body.data).to.be.greaterThan(0);
        });
        it('Should get user 2 funds', async () => {
            const res = await client
                .get(`${usersBaseAPI}/${testUserId2}/wallet/funds/retrieve`)
                .set('Authorization', userAuthToken2)
                .expect(200);
            expect(res).to.have.property('body');
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.be.Number;
            expect(res.body.data).to.be.equal(0);
        });
    });
});
