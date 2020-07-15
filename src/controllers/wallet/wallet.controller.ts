import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { get, HttpErrors, param, patch, post, requestBody } from '@loopback/rest';
import { User } from '@src/models';
import { UserRepository } from '@src/repositories';
import { StripeService } from '@src/services';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, IWalletAddFundReqData, IWalletAddPaymentMethodReqData } from '@src/utils/interfaces';
import { USER_MESSAGES, WALLET_MESSAGES } from '@src/utils/messages';
import { WALLET_VALIDATORS } from '@src/utils/validators';
import { isEqual, merge } from 'lodash';
import Stripe from 'stripe';
import Schema from 'validate';

export class WalletController {
    constructor(
        @repository(UserRepository)
        private userRepository: UserRepository,
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
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.CREATE_PAYMENT_METHODS)] })
    @post(API_ENDPOINTS.USERS.WALLET.CREATE_PAYMENT_METHOD)
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
    @patch(API_ENDPOINTS.USERS.WALLET.DEFAULT_PAYMENT_METHOD)
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
    @patch(API_ENDPOINTS.USERS.WALLET.DETACH_PAYMENT_METHOD)
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
        try {
            const validationSchema = {
                amount: WALLET_VALIDATORS.amount,
            };

            const validation = new Schema(validationSchema, { strip: true });
            const validationErrors = validation.validate(body);
            if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

            const user = await this.userRepository.findById(id);
            if (!user._customerToken) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            const defaultPaymentMethod = await this.stripeService.defaultPaymentMethod(user._customerToken);

            const paymentIntent = await this.stripeService.stripe.paymentIntents.create({
                amount: body.amount,
                currency: 'usd',
                confirm: true,
                customer: user._customerToken,
                description: `Top Prop. Funds added.`,
                payment_method: defaultPaymentMethod,
            });

            console.log(paymentIntent);

            return { message: `Funds added.` };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }
}
