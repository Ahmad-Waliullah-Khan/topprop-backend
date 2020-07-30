import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { get, HttpErrors, param, patch, post, requestBody } from '@loopback/rest';
import { User } from '@src/models';
import { TopUpRepository, UserRepository } from '@src/repositories';
import { StripeService } from '@src/services';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, IWalletAddFundReqData, IWalletAddPaymentMethodReqData } from '@src/utils/interfaces';
import { USER_MESSAGES, WALLET_MESSAGES } from '@src/utils/messages';
import { WALLET_VALIDATORS } from '@src/utils/validators';
import chalk from 'chalk';
import { isEqual, merge } from 'lodash';
import Stripe from 'stripe';
import Schema from 'validate';

export class WalletController {
    constructor(
        @repository(UserRepository)
        private userRepository: UserRepository,
        @repository(TopUpRepository)
        private topUpRepository: TopUpRepository,
        @service() protected stripeService: StripeService,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_WALLET)] })
    @get(API_ENDPOINTS.USERS.WALLET.FETCH_WALLET_INFO)
    async fetchWalletInfo(
        @param.path.number('id') id: typeof User.prototype.id,
    ): Promise<ICommonHttpResponse | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);

            if (!user._customerToken) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            let customer = await this.stripeService.stripe.customers.retrieve(user._customerToken);

            const paymentMethods: Stripe.PaymentMethod[] = [];
            for await (const paymentMethod of this.stripeService.stripe.paymentMethods.list({
                customer: user._customerToken,
                type: 'card',
            })) {
                paymentMethods.push(paymentMethod);
            }

            let data = merge(customer, { paymentMethods });
            return { data };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_PAYMENT_METHODS)] })
    @get(API_ENDPOINTS.USERS.WALLET.PAYMENT_METHODS.CRUD)
    async fetchPaymentMethods(
        @param.path.number('id') id: typeof User.prototype.id,
    ): Promise<ICommonHttpResponse<Stripe.PaymentMethod[]> | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);
            const paymentMethods: Stripe.PaymentMethod[] = [];

            if (user._customerToken) {
                // let customer = await this.stripeService.stripe.customers.retrieve(user._customerToken);

                for await (const paymentMethod of this.stripeService.stripe.paymentMethods.list({
                    customer: user._customerToken,
                    type: 'card',
                })) {
                    paymentMethods.push(paymentMethod);
                }
            }

            return { data: paymentMethods };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.CREATE_PAYMENT_METHODS)] })
    @post(API_ENDPOINTS.USERS.WALLET.PAYMENT_METHODS.CRUD)
    async createPaymentMethod(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody()
        body: IWalletAddPaymentMethodReqData,
    ): Promise<ICommonHttpResponse | undefined> {
        const validationSchema = {
            paymentMethodToken: WALLET_VALIDATORS.paymentMethodToken,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

            const user = await this.userRepository.findById(id);
            let overrideDefaultPaymentMethod = false;
            if (user._customerToken) {
                overrideDefaultPaymentMethod = true;
                const paymentMethod = await this.stripeService.stripe.paymentMethods.create({
                    type: 'card',
                    card: { token: body.paymentMethodToken },
                });
                await this.stripeService.stripe.paymentMethods.attach(paymentMethod.id, {
                    customer: user._customerToken,
                });
                await this.stripeService.stripe.customers.update(user._customerToken, {
                    invoice_settings: { default_payment_method: paymentMethod.id },
                });
            } else {
                let paymentMethod = await this.stripeService.stripe.paymentMethods.create({
                    type: 'card',
                    card: { token: body.paymentMethodToken },
                });
                let customer = await this.stripeService.stripe.customers.create({
                    payment_method: paymentMethod.id,
                    email: user.email,
                    name: user.fullName,
                    description: `Top Prop customer for ${user.email}`,
                    invoice_settings: {
                        default_payment_method: paymentMethod.id,
                    },
                    metadata: {
                        id: user.id.toString(),
                        fullName: user.fullName,
                        email: user.email,
                        username: user.username,
                    },
                });
                user._customerToken = customer.id;
                await this.userRepository.save(user);
            }
            return { message: `Payment method ${overrideDefaultPaymentMethod ? 'updated' : 'created'}.` };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.UPDATE_PAYMENT_METHODS)] })
    @patch(API_ENDPOINTS.USERS.WALLET.PAYMENT_METHODS.DEFAULT_PAYMENT_METHOD)
    async setDefaultPaymentMethod(
        @param.path.number('id') id: typeof User.prototype.id,
        @param.path.string('paymentMethod') paymentMethod: string,
    ): Promise<ICommonHttpResponse | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

            const user = await this.userRepository.findById(id);
            if (!user._customerToken) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            let customer = (await this.stripeService.stripe.customers.retrieve(user._customerToken)) as Stripe.Customer;
            let defaultPaymentMethod = customer.invoice_settings && customer.invoice_settings.default_payment_method;

            if (isEqual(defaultPaymentMethod, paymentMethod))
                throw new HttpErrors.NotAcceptable(WALLET_MESSAGES.PAYMENT_METHOD_ALREADY_DEFAULT);

            await this.stripeService.stripe.customers.update(user._customerToken, {
                invoice_settings: { default_payment_method: paymentMethod },
            });
            return { message: `Default payment method set.` };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.UPDATE_PAYMENT_METHODS)] })
    @patch(API_ENDPOINTS.USERS.WALLET.PAYMENT_METHODS.DETACH_PAYMENT_METHOD)
    async detachPaymentMethod(
        @param.path.number('id') id: typeof User.prototype.id,
        @param.path.string('paymentMethod') paymentMethod: string,
    ): Promise<ICommonHttpResponse | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

            const user = await this.userRepository.findById(id);
            if (!user._customerToken) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            let customer = (await this.stripeService.stripe.customers.retrieve(user._customerToken)) as Stripe.Customer;
            let defaultPaymentMethod = customer.invoice_settings && customer.invoice_settings.default_payment_method;

            if (isEqual(defaultPaymentMethod, paymentMethod))
                throw new HttpErrors.NotAcceptable(WALLET_MESSAGES.DEFAULT_PAYMENT_METHOD_DETACH_ERROR);

            await this.stripeService.stripe.paymentMethods.detach(paymentMethod);

            return { message: `Payment method detached.` };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.ADD_WALLET_FUNDS)] })
    @post(API_ENDPOINTS.USERS.WALLET.FUNDS.ADD)
    async addFunds(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody() body: IWalletAddFundReqData,
    ): Promise<ICommonHttpResponse | undefined> {
        let paymentIntentCreated: string | null = null;
        try {
            const validationSchema = {
                amount: WALLET_VALIDATORS.amount,
                paymentMethod: WALLET_VALIDATORS.paymentMethod,
            };

            const validation = new Schema(validationSchema, { strip: true });
            const validationErrors = validation.validate(body);
            if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

            let user = await this.userRepository.findById(id);
            if (!user._customerToken) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            // if (!user._connectToken) {
            //     let splittedName = user.fullName.split(' ');
            //     let firstName = splittedName[0] || '';
            //     let lastName = splittedName[1] || '';
            //     const account = await this.stripeService.stripe.accounts.create({
            //         country: 'US',
            //         type: 'custom',
            //         requested_capabilities: ['transfers', 'card_payments'],
            //         email: user.email,
            //         default_currency: 'usd',
            //         business_type: 'individual',
            //         business_profile: {
            //             url: 'https://topprop.io',
            //         },
            //         settings: { payouts: { schedule: { interval: 'manual' }, statement_descriptor: 'TopProp' } },
            //         individual: { email: user.email, first_name: firstName, last_name: lastName },
            //         metadata: {
            //             email: user.email,
            //             fullName: user.fullName,
            //             customerAccount: user._customerToken,
            //             id: user.id.toString(),
            //         },
            //     });
            //     await this.stripeService.stripe.accounts.update(account.id, {
            //         tos_acceptance: {
            //             date: Math.floor(Date.now() / 1000),
            //             ip: req.ip,
            //         },
            //     });
            //     user._connectToken = account.id;
            //     user = await this.userRepository.save(user);
            // }

            let paymentMethod: string;
            if (body.paymentMethod) {
                if (!(await this.stripeService.validPaymentMethod(user._customerToken, body.paymentMethod)))
                    throw new HttpErrors.BadRequest(WALLET_MESSAGES.INVALID_PAYMENT_METHOD);
                else paymentMethod = body.paymentMethod;
            } else paymentMethod = await this.stripeService.defaultPaymentMethod(user._customerToken);

            const paymentIntent = await this.stripeService.stripe.paymentIntents.create(
                {
                    amount: body.amount,
                    currency: 'usd',
                    confirm: true,
                    customer: user._customerToken,
                    description: `Top Prop. Funds added.`,
                    statement_descriptor_suffix: 'TOPPROP',
                    payment_method: paymentMethod,
                    metadata: {
                        userId: user.id,
                    },
                    // transfer_data: {
                    //     destination: user._connectToken,
                    //     amount: this.stripeService.amountAfterFees(body.amount),
                    // },
                },
                // { stripeAccount: user._connectToken },
            );

            paymentIntentCreated = paymentIntent.id;
            const topUp = await this.topUpRepository.create({
                paymentIntentId: paymentIntent.id,
                grossAmount: paymentIntent.amount,
                //* TOP PROP WILL TAKE OVER THE STRIPE FEE
                netAmount: paymentIntent.amount,
                // netAmount: this.stripeService.amountAfterFees(body.amount),
                userId: user.id,
            });

            //*EXTRA FEATURE - NO NEED TO RUN THIS ASYNC
            paymentIntentCreated = null;
            this.stripeService.stripe.paymentIntents
                .update(paymentIntent.id, {
                    metadata: { ...paymentIntent.metadata, topUpId: topUp.id.toString() },
                })
                .then(() =>
                    console.log(
                        chalk.greenBright(`Payment intent(${paymentIntent.id}) updated with the internal top-up id.`),
                    ),
                )
                .catch(err =>
                    console.error(
                        chalk.redBright(
                            `Error updating payment intent (${paymentIntent.id}) with the internal top-up id. Error: `,
                            err,
                        ),
                    ),
                );
            return { message: `Funds added to your account.` };
        } catch (error) {
            if (paymentIntentCreated) {
                await this.stripeService.stripe.refunds.create({ payment_intent: paymentIntentCreated });
                console.log(`Payment refunded.`);
            }
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.CALCULATE_WALLET_NET_FUNDS)],
    })
    @post(API_ENDPOINTS.USERS.WALLET.FUNDS.CALCULATE_NET_AMOUNT)
    async calculateNetFunds(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody() body: IWalletAddFundReqData,
    ): Promise<ICommonHttpResponse<Number>> {
        const validationSchema = {
            amount: WALLET_VALIDATORS.amount,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
        return { data: this.stripeService.amountAfterFees(body.amount) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_WALLET_FUNDS)] })
    @get(API_ENDPOINTS.USERS.WALLET.FUNDS.RETRIEVE)
    async getWalletFunds(@param.path.number('id') id: typeof User.prototype.id): Promise<ICommonHttpResponse<Number>> {
        if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

        //* RETRIEVE ALL TOP-UPS WHICH HAVE NOT BEEN PAID OUT
        const topUps = await this.userRepository
            .topUps(id)
            .find({ where: { paidOut: false, refunded: false }, fields: { netAmount: true } });

        //TODO WE SHOULD HAVE HERE ALSO THE WON COMPETITIONS

        const totalNetAMount = topUps.reduce((total, current) => {
            return total + current.netAmount;
        }, 0);
        return { data: totalNetAMount };
    }
}
