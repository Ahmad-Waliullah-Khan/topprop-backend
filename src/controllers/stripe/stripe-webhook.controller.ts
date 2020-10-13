import { Getter, inject, service } from '@loopback/core';
import { repository, Where } from '@loopback/repository';
import { param, post, requestBody, Response, RestBindings } from '@loopback/rest';
import { Bet, Gain, TopUp, User } from '@src/models';
import { BetRepository, GainRepository, TopUpRepository, UserRepository } from '@src/repositories';
import { StripeService, UserService } from '@src/services';
import { API_ENDPOINTS, EMAIL_TEMPLATES } from '@src/utils/constants';
import { IRawRequest, ISignedEventData } from '@src/utils/interfaces';
import chalk from 'chalk';
import { isEqual, isNull } from 'lodash';
import moment from 'moment';
import Stripe from 'stripe';

export class StripeWebhookController {
    private testStripeWebhookSecret = 'whsec_9Ad6PLZq4K8v9z845OcocMESu7AMxetQ';

    private stripeWebhookPaymentRefundedSecretSign = isEqual(process.env.NODE_ENV, 'local')
        ? this.testStripeWebhookSecret
        : (process.env.STRIPE_WEBHOOK_PAYMENTS_REFUNDED_SECRET_SIGN as string);

    private stripeWebhookVerificationFileUpdatedSecretSign = isEqual(process.env.NODE_ENV, 'local')
        ? this.testStripeWebhookSecret
        : (process.env.STRIPE_WEBHOOK_VERIFICATION_FILE_UPDATED_SECRET_SIGN as string);

    private stripeWebhookPayoutFailedSecretSign = isEqual(process.env.NODE_ENV, 'local')
        ? this.testStripeWebhookSecret
        : (process.env.STRIPE_WEBHOOK_PAYOUT_FAILED_SECRET_SIGN as string);

    private stripeWebhookPayoutPaidSecretSign = isEqual(process.env.NODE_ENV, 'local')
        ? this.testStripeWebhookSecret
        : (process.env.STRIPE_WEBHOOK_PAYOUT_PAID_SECRET_SIGN as string);

    constructor(
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('TopUpRepository') protected topUpRepositoryGetter: Getter<TopUpRepository>,
        @repository.getter('BetRepository') protected betRepositoryGetter: Getter<BetRepository>,
        @repository.getter('GainRepository') protected gainRepositoryGetter: Getter<GainRepository>,
        @service() private userService: UserService,
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

            let where: Where<User> = {};

            if (event.account)
                where = {
                    _connectToken: event.account,
                };

            if (objectData.customer)
                where = {
                    _customerToken: objectData.customer,
                };

            const user = await userRepository.findOne({ where });

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

            this.userService.sendEmail(signedEventData.user, EMAIL_TEMPLATES.VERIFICATION_FILE_FAILED, {
                plural,
                side,
                details,
                user: signedEventData.user,
            });
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
            this.userService.sendEmail(signedEventData.user, EMAIL_TEMPLATES.VERIFICATION_FILE_DONE, {
                plural,
                side,
                user: signedEventData.user,
            });
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
            this.userService.sendEmail(signedEventData.user, EMAIL_TEMPLATES.VERIFICATION_FILE_DONE, {
                plural,
                side,
                user: signedEventData.user,
            });
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

            this.userService.sendEmail(signedEventData.user, EMAIL_TEMPLATES.VERIFICATION_FILE_DONE, {
                plural,
                side,
                user: signedEventData.user,
            });
        }
    }

    //FAILED PAYOUT
    @post(API_ENDPOINTS.STRIPE_WEBHOOKS.CONNECT_ACCOUNTS.PAYOUTS.FAILED, {
        responses: {
            '200': {
                description: 'Stripe Payout Failed Connect Account POST success',
            },
        },
    })
    async connectAccountPayoutFailed(
        @inject(RestBindings.Http.RESPONSE) res: Response,
        @inject(RestBindings.Http.REQUEST) req: IRawRequest,
        @param.header.string('stripe-signature') stripeSign: string,
        @requestBody() body: any,
    ) {
        const signedEventData = await this.signEvent(
            stripeSign,
            req.rawBody,
            this.stripeWebhookPayoutFailedSecretSign,
            res,
        );
        if (!signedEventData.user || !signedEventData.event || !isEqual(signedEventData.event.type, 'payout.failed'))
            return;

        const betRepo = await this.betRepositoryGetter();
        const gainRepo = await this.gainRepositoryGetter();
        const topUpRepo = await this.topUpRepositoryGetter();

        const payout = signedEventData.event.data.object as Stripe.Payout;

        const revertUpdate: Partial<TopUp | Bet | Gain> = {
            paid: false,
            payoutId: null,
            paidAt: null,
            transferred: false,
            transferId: null,
            transferredAt: null,
        };

        const whereUpdate: Where<TopUp | Bet | Gain> = {
            and: [
                {
                    or: [
                        {
                            paid: false,
                        },
                        { payoutId: payout.id, paid: true },
                    ],
                },
                { transferred: true },
                { userId: signedEventData.user.id },
            ],
        };

        await betRepo.updateAll(revertUpdate, whereUpdate);
        await gainRepo.updateAll(revertUpdate, whereUpdate);
        await topUpRepo.updateAll(revertUpdate, whereUpdate);

        this.userService.sendEmail(signedEventData.user, EMAIL_TEMPLATES.PAYOUT_FAILED, {
            details: payout.failure_message,
            user: signedEventData.user,
        });
    }

    //PAID PAYOUT
    @post(API_ENDPOINTS.STRIPE_WEBHOOKS.CONNECT_ACCOUNTS.PAYOUTS.PAID, {
        responses: {
            '200': {
                description: 'Stripe Payout Paid Connect Account POST success',
            },
        },
    })
    async connectAccountPayoutPaid(
        @inject(RestBindings.Http.RESPONSE) res: Response,
        @inject(RestBindings.Http.REQUEST) req: IRawRequest,
        @param.header.string('stripe-signature') stripeSign: string,
        @requestBody() body: any,
    ) {
        const signedEventData = await this.signEvent(
            stripeSign,
            req.rawBody,
            this.stripeWebhookPayoutPaidSecretSign,
            res,
        );
        if (!signedEventData.user || !signedEventData.event || !isEqual(signedEventData.event.type, 'payout.paid'))
            return;

        const betRepo = await this.betRepositoryGetter();
        const gainRepo = await this.gainRepositoryGetter();
        const topUpRepo = await this.topUpRepositoryGetter();

        const payout = signedEventData.event.data.object as Stripe.Payout;

        const paidUpdate: Partial<TopUp | Bet | Gain> = { paid: true, payoutId: payout.id, paidAt: moment().toDate() };

        const whereUpdate: Where<TopUp | Bet | Gain> = {
            paid: false,
            transferred: true,
            userId: signedEventData.user.id,
        };

        await betRepo.updateAll(paidUpdate, whereUpdate);
        await gainRepo.updateAll(paidUpdate, whereUpdate);
        await topUpRepo.updateAll(paidUpdate, whereUpdate);

        this.userService.sendEmail(signedEventData.user, EMAIL_TEMPLATES.PAYOUT_PAID, {
            user: signedEventData.user,
        });
    }
}
