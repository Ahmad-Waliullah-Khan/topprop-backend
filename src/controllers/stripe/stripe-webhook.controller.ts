import { Getter, inject, service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { param, post, requestBody, Response, RestBindings } from '@loopback/rest';
import { TopUpRepository, UserRepository } from '@src/repositories';
import { StripeService } from '@src/services';
import { API_ENDPOINTS } from '@src/utils/constants';
import { IRawRequest, ISignedEventData } from '@src/utils/interfaces';
import chalk from 'chalk';
import { isEqual, isNull } from 'lodash';
import Stripe from 'stripe';

export class StripeWebhookController {
    private testStripeWebhookSecret = 'whsec_9Ad6PLZq4K8v9z845OcocMESu7AMxetQ';

    private stripeWebhookPaymentRefundedSecretSign = isEqual(process.env.NODE_ENV, 'local')
        ? this.testStripeWebhookSecret
        : (process.env.STRIPE_WEBHOOK_PAYMENTS_REFUNDED_SECRET_SIGN as string);

    private stripeWebhookVerificationFileUpdatedSecretSign = isEqual(process.env.NODE_ENV, 'local')
        ? this.testStripeWebhookSecret
        : (process.env.STRIPE_WEBHOOK_VERIFICATION_FILE_UPDATED_SECRET_SIGN as string);

    constructor(
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('TopUpRepository') protected topUpRepositoryGetter: Getter<TopUpRepository>,
        // @service() private emailService: EmailService,
        @service() private stripeService: StripeService,
    ) {
        if (!process.env.STRIPE_WEBHOOK_PAYMENTS_REFUNDED_SECRET_SIGN)
            throw new Error(`Must provide stripe webhook payment refunded sign env`);
        if (!process.env.STRIPE_WEBHOOK_VERIFICATION_FILE_UPDATED_SECRET_SIGN)
            throw new Error(`Must provide stripe webhook verification file upload sign env`);
    }

    private async signEvent(
        sign: string,
        rawBody: string | Buffer,
        secretSignKey: string,
        res: Response,
    ): Promise<ISignedEventData> {
        let event: Stripe.Event;
        let signedEventData: ISignedEventData = {
            user: null,
            event: null,
            error: true,
        };
        try {
            event = this.stripeService.stripe.webhooks.constructEvent(rawBody, sign, secretSignKey);
            const objectData = event.data.object as { customer: string };
            const userRepository = await this.userRepositoryGetter();
            const user = await userRepository.findOne({
                where: {
                    _customerToken: objectData.customer,
                },
            });
            signedEventData = {
                event,
                user,
                error: false,
            };
        } catch (err) {
            console.log(`❌ Error signing stripe webhook: ${err.message}`);
            signedEventData.errorMessage = err.message;
        }
        // Return a response based on the error event.
        signedEventData.event ? res.sendStatus(200) : res.sendStatus(400);
        return signedEventData;
    }

    @post(API_ENDPOINTS.STRIPE_WEBHOOKS.PAYMENTS.REFUNDED, {
        responses: {
            '200': {
                description: 'Stripe Payment Refunded POST success',
            },
        },
    })
    async paymentRefunded(
        @inject(RestBindings.Http.RESPONSE) res: Response,
        @inject(RestBindings.Http.REQUEST) req: IRawRequest,
        @param.header.string('stripe-signature') stripeSign: string,
        @requestBody()
        body: any,
    ) {
        const signedEventData = await this.signEvent(
            stripeSign,
            req.rawBody,
            this.stripeWebhookPaymentRefundedSecretSign,
            res,
        );
        if (!signedEventData.user || !signedEventData.event || !isEqual(signedEventData.event.type, 'charge.refunded'))
            return; //* There is no user or event  or event type is not payment refunded to send notification.

        const charge = signedEventData.event.data.object as Stripe.Charge;
        const topUpRepository = await this.topUpRepositoryGetter();

        const topUpsUpdated = await topUpRepository.updateAll(
            { refunded: charge.refunded, refundId: charge.refunds.data[0].id },
            {
                paymentIntentId: charge.payment_intent as string,
            },
        );
        topUpsUpdated.count &&
            console.log(chalk.greenBright(`Top up refunded with paymentIntentId: ${charge.payment_intent}`));
    }

    //VERIFICATION FILE UPDATED
    @post(API_ENDPOINTS.STRIPE_WEBHOOKS.CONNECT_ACCOUNTS.VERIFICATION_FILE_UPDATED, {
        responses: {
            '200': {
                description: 'Stripe Verification File updated POST success',
            },
        },
    })
    async verificationFileUpdated(
        @inject(RestBindings.Http.RESPONSE) res: Response,
        @inject(RestBindings.Http.REQUEST) req: IRawRequest,
        @param.header.string('stripe-signature') stripeSign: string,
        @requestBody()
        body: any,
    ) {
        const signedEventData = await this.signEvent(
            stripeSign,
            req.rawBody,
            this.stripeWebhookVerificationFileUpdatedSecretSign,
            res,
        );
        if (!signedEventData.user || !signedEventData.event || !isEqual(signedEventData.event.type, 'account.updated'))
            return;

        const eventData = signedEventData.event;
        eventData.data.previous_attributes;
        let previousAttrVerification =
            eventData.data['previous_attributes'] &&
            (eventData.data['previous_attributes'] as any)['individual'] &&
            (eventData.data['previous_attributes'] as any)['individual'].verification;

        let previousVerificationStatus =
            eventData.data['previous_attributes'] &&
            (eventData.data['previous_attributes'] as any)['individual'] &&
            (eventData.data['previous_attributes'] as any)['individual'].verification &&
            (eventData.data['previous_attributes'] as any)['individual'].verification.status;

        let currentVerificationStatus =
            (eventData.data.object as any)['individual'] &&
            (eventData.data.object as any)['individual'].verification &&
            (eventData.data.object as any)['individual'].verification.status;

        let verification =
            (eventData.data.object as any)['individual'] && (eventData.data.object as any)['individual'].verification;

        let verificationDocument =
            (eventData.data.object as any)['individual'] &&
            (eventData.data.object as any)['individual'].verification &&
            (eventData.data.object as any)['individual'].verification.document;

        if (
            isEqual(previousVerificationStatus, 'pending') &&
            isEqual(currentVerificationStatus, 'unverified') &&
            verificationDocument
        ) {
            let side = '';
            let plural = false;
            let stripeFileId = '';
            let details = verificationDocument.details || verification.details;
            if (verificationDocument.back && verificationDocument.front) {
                stripeFileId = `${verificationDocument.front} and ${verificationDocument.back}`;
                side = 'front and back';
                plural = true;
            }
            if (verificationDocument.back && !verificationDocument.front) {
                stripeFileId = verificationDocument.back;
                side = 'back';
            }
            if (!verificationDocument.back && verificationDocument.front) {
                stripeFileId = verificationDocument.front;
                side = 'front';
            }
            // TODO: send email notification
        }
        if (
            isEqual(previousVerificationStatus, 'pending') &&
            isEqual(currentVerificationStatus, 'verified') &&
            verificationDocument
        ) {
            let side = '';
            let plural = false;
            let stripeFileId = '';
            if (verificationDocument.back && verificationDocument.front) {
                stripeFileId = `${verificationDocument.front} and ${verificationDocument.back}`;
                side = 'front and back';
                plural = true;
            }
            if (verificationDocument.back && !verificationDocument.front) {
                stripeFileId = verificationDocument.back;
                side = 'back';
            }
            if (!verificationDocument.back && verificationDocument.front) {
                stripeFileId = verificationDocument.front;
                side = 'front';
            }
            // TODO: send email notification
        }
        if (
            isEqual(previousVerificationStatus, 'unverified') &&
            isEqual(currentVerificationStatus, 'verified') &&
            verificationDocument
        ) {
            let side = '';
            let plural = false;
            let stripeFileId = '';
            if (verificationDocument.back && verificationDocument.front) {
                stripeFileId = `${verificationDocument.front} and ${verificationDocument.back}`;
                side = 'front and back';
                plural = true;
            }
            if (verificationDocument.back && !verificationDocument.front) {
                stripeFileId = verificationDocument.back;
                side = 'back';
            }
            if (!verificationDocument.back && verificationDocument.front) {
                stripeFileId = verificationDocument.front;
                side = 'front';
            }
            // TODO: send email notification
        }
        if (
            isEqual(currentVerificationStatus, 'verified') &&
            previousAttrVerification &&
            previousAttrVerification.document
        ) {
            let side = '';
            let plural = false;
            let stripeFileId = '';
            if (isNull(previousAttrVerification.document.back)) {
                stripeFileId = verificationDocument.back;
                side = 'back';
            }
            if (isNull(previousAttrVerification.document.front)) {
                stripeFileId = verificationDocument.front;
                side = 'front';
            }

            if (isNull(previousAttrVerification.document.front) && isNull(previousAttrVerification.document.back)) {
                stripeFileId = `${verificationDocument.front} and ${verificationDocument.back}`;
                side = 'front and back';
                plural = true;
            }

            // TODO: send email notification
        }
    }

    // @authorize(['*'])
    // @post(API_ENDPOINTS.STRIPE_WEBHOOKS.INVOICES.PAYMENT_FAILED, {
    //     responses: {
    //         '200': {
    //             description: 'Stripe Payment Failed POST success',
    //         },
    //     },
    // })
    // async invoicesPaymentFailed(
    //     @inject(RestBindings.Http.RESPONSE) res: Response,
    //     @inject(RestBindings.Http.REQUEST) req: IRawRequest,
    //     @param.header.string('stripe-signature') stripeSign: string,
    //     @requestBody() body: any,
    // ) {
    //     const signedEventData = await this.signEvent(
    //         stripeSign,
    //         req.rawBody,
    //         this.stripeWebhookPaymentFailedSecret,
    //         res,
    //     );
    //     if (
    //         !signedEventData.user ||
    //         !signedEventData.event ||
    //         !isEqual(signedEventData.event.type, 'payment_intent.payment_failed')
    //     )
    //         return; //* There is no user or event  or event type is not payment succeeded to send notification.

    //     this.emailNotificationService.sendServiceSubscriptionPaymentFailed(signedEventData.user, signedEventData.event);
    // }
    // @authorize(['*'])
    // @post(API_ENDPOINTS.STRIPE_WEBHOOKS.SUBSCRIPTIONS.SUBSCRIPTION_CANCELED, {
    //     responses: {
    //         '200': {
    //             description: 'Stripe Subscription Canceled POST success',
    //         },
    //     },
    // })
    // async subscriptionCanceled(
    //     @inject(RestBindings.Http.RESPONSE) res: Response,
    //     @inject(RestBindings.Http.REQUEST) req: IRawRequest,
    //     @param.header.string('stripe-signature') stripeSign: string,
    //     @requestBody() body: any,
    // ) {
    //     const signedEventData = await this.signEvent(
    //         stripeSign,
    //         req.rawBody,
    //         this.stripeWebhookSubscriptionCanceledSecret,
    //         res,
    //     );
    //     if (
    //         !signedEventData.user ||
    //         !signedEventData.event ||
    //         !isEqual(signedEventData.event.type, 'customer.subscription.deleted')
    //     )
    //         return; //* There is no user or event  or event type is not payment succeeded to send notification.

    //     this.emailNotificationService.sendSubscriptionCanceledEmail(signedEventData.user, signedEventData.event);
    // }

    // @authorize(['*'])
    // @post(API_ENDPOINTS.STRIPE_WEBHOOKS.SUBSCRIPTIONS.SUBSCRIPTION_UPDATED, {
    //     responses: {
    //         '200': {
    //             description: 'Stripe Subscription Updated POST success',
    //         },
    //     },
    // })
    // async subscriptionUpdated(
    //     @inject(RestBindings.Http.RESPONSE) res: Response,
    //     @inject(RestBindings.Http.REQUEST) req: IRawRequest,
    //     @param.header.string('stripe-signature') stripeSign: string,
    //     @requestBody() body: any,
    // ) {
    //     const signedEventData = await this.signEvent(
    //         stripeSign,
    //         req.rawBody,
    //         this.stripeWebhookSubscriptionUpdatedSecret,
    //         res,
    //     );
    //     if (
    //         !signedEventData.user ||
    //         !signedEventData.event ||
    //         !isEqual(signedEventData.event.type, 'customer.subscription.updated')
    //     )
    //         return; //* There is no user or event  or event type is not payment succeeded to send notification.

    //     if (!isEmpty(signedEventData.event.data.previous_attributes) && !isEmpty(signedEventData.event.data.object)) {
    //         const subscription = signedEventData.event.data.object as ISubscription;
    //         const prevAttributes = signedEventData.event.data.previous_attributes as Partial<ISubscription>;

    //         const incompleteStatus: Stripe.Subscription.Status = 'incomplete';
    //         const pastDueStatus: Stripe.Subscription.Status = 'past_due';
    //         const activeStatus: Stripe.Subscription.Status = 'active';

    //         if (
    //             (isEqual(prevAttributes.status, pastDueStatus) || isEqual(prevAttributes.status, incompleteStatus)) &&
    //             isEqual(subscription.status, activeStatus)
    //         )
    //             this.emailNotificationService.sendSubscriptionActiveAfterIncompleteEmail(
    //                 signedEventData.user,
    //                 signedEventData.event,
    //             );
    //     }
    // }
}
