import { Getter, inject, service } from '@loopback/core';
import { param, post, requestBody } from '@loopback/openapi-v3';
import { repository, Where } from '@loopback/repository';
import { Response, RestBindings } from '@loopback/rest';
import { Bet, Gain, TopUp, User, WithdrawRequest } from '@src/models';
import {
    BetRepository,
    GainRepository,
    PaymentGatewayEventRepository,
    TopUpRepository,
    UserRepository,
    WithdrawRequestRepository,
} from '@src/repositories';
import { DwollaWebhookEventPayload, PaymentGatewayService, UserService } from '@src/services';
import { API_ENDPOINTS, DWOLLA_WEBHOOK_EVENTS, EMAIL_TEMPLATES, WITHDRAW_REQUEST_STATUSES } from '@src/utils/constants';
import { IRawRequest } from '@src/utils/interfaces';
import { Buffer } from 'buffer';
import { createHmac, timingSafeEqual } from 'crypto';
import { isEqual, lastIndexOf } from 'lodash';
import moment from 'moment';

export class PaymentGatewayWebhookController {
    private webhookSecret: string;

    constructor(
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('WithdrawRequestRepository')
        protected withdrawRequestRepository: Getter<WithdrawRequestRepository>,
        @repository.getter('TopUpRepository') protected topUpRepositoryGetter: Getter<TopUpRepository>,
        @repository.getter('BetRepository') protected betRepositoryGetter: Getter<BetRepository>,
        @repository.getter('GainRepository') protected gainRepositoryGetter: Getter<GainRepository>,
        @repository.getter('PaymentGatewayEventRepository')
        protected paymentGatewayEventRepositoryGetter: Getter<PaymentGatewayEventRepository>,
        @service() private userService: UserService,
        @service() private paymentGatewayService: PaymentGatewayService,
    ) {
        if (!process.env.DWOLLA_WEBHOOK_SECRET) throw new Error(`Must provide payment gateway webhook secret`);
        this.webhookSecret = process.env.DWOLLA_WEBHOOK_SECRET;
    }

    private verifyGatewaySignature(
        proposed_signature: string,
        webhook_secret: string,
        payload_body: string | Buffer,
    ): boolean {
        var hash = createHmac('sha256', webhook_secret).update(payload_body).digest('hex');
        return timingSafeEqual(Buffer.from(proposed_signature), Buffer.from(hash));
    }

    @post(API_ENDPOINTS.USERS.WALLET.WEBHOOKS, {
        responses: {
            '200': {
                description: "Dwolla's webhook handler",
            },
        },
    })
    async webhookHandler(
        @inject(RestBindings.Http.RESPONSE) res: Response,
        @inject(RestBindings.Http.REQUEST) req: IRawRequest,
        @param.header.string('X-Request-Signature-SHA-256') paymentGatewaySignature: string,
        @requestBody()
        body: DwollaWebhookEventPayload,
    ): Promise<void> {
        console.log(
            '🚀 ~ file: payment-gateway-webhook.controller.ts ~ line 61 ~ PaymentGatewayWebhookController ~ body',
            body.topic,
        );
        //EARLY REPLY
        res.send(200);

        if (this.verifyGatewaySignature(paymentGatewaySignature, this.webhookSecret, req.rawBody)) {
            const paymentGatewayEventRepository = await this.paymentGatewayEventRepositoryGetter();
            const eventUrl = body._links.self.href;
            const eventId = body.id;
            const eventsCountData = await paymentGatewayEventRepository.count({ eventUrl, eventId });
            if (eventsCountData.count) return;

            let createEvent = true;
            switch (body.topic) {
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_CREATED: {
                    // const customer = await this.paymentGatewayService.getCustomer(body.)
                    // const user = await this.fetchUserFromCustomer(body.resourceId);
                    // user &&
                    //     this.userService.sendEmail(user, EMAIL_TEMPLATES.WALLET_CREATED, {
                    //         user,
                    //         text: {
                    //             title: `Wallet Created`,
                    //             subtitle: `Your wallet is now created. Let's add some funds to start playing!`,
                    //         },
                    //     });

                    break;
                }
                //*HANDLE CUSTOMER VERIFICATIONS STATUSES
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFIED: {
                    const details = `Your account is now verified. You profile is now complete!`;
                    await this.handleCustomerVerificationUpdate(body.resourceId, details);

                    break;
                }
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_REVERIFICATION_NEEDED: {
                    const details = `Your account could not be verified, please try to update your information and submit it again.`;
                    await this.handleCustomerVerificationUpdate(body.resourceId, details);

                    break;
                }
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFICATION_DOCUMENT_NEEDED: {
                    const details = `Your account could not be verified, please try uploading your ID to solve this.`;
                    await this.handleCustomerVerificationUpdate(body.resourceId, details);

                    break;
                }
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFICATION_DOCUMENT_FAILED: {
                    const details = `Your account could not be verified using your ID, please reach to us directly as soon as possible to solve this.`;

                    await this.handleCustomerVerificationUpdate(body.resourceId, details);

                    break;
                }
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFICATION_DOCUMENT_APPROVED: {
                    const details = `Your ID was approved and your account is in review. We will keep you posted.`;

                    await this.handleCustomerVerificationUpdate(body.resourceId, details);

                    break;
                }
                //*HANDLE FUNDING SOURCES STATUSES
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_FUNDING_SOURCE_VERIFIED: {
                    const fundingSource = await this.paymentGatewayService.getFundingSource(body.resourceId);
                    const details = `Your funding source (${fundingSource?.name} - ${fundingSource?.bankName}) has been verified. You can fund your wallet now!`;
                    await this.handleFundingSourceVerificationUpdate(body._links.customer.href as string, details);

                    break;
                }
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_REVERIFICATION_NEEDED: {
                    const fundingSource = await this.paymentGatewayService.getFundingSource(body.resourceId);
                    const details = `Your funding source (${fundingSource?.name} - ${fundingSource?.bankName}) could not be verified, please try again.`;
                    await this.handleFundingSourceVerificationUpdate(body._links.customer.href as string, details);

                    break;
                }
                //*HANDLE BANK TRANSFERS STATUSES
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_CREATED: {
                    await this.handleTransfer(body);
                    break;
                }
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_COMPLETED: {
                    await this.handleTransfer(body);
                    break;
                }
                case DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_FAILED: {
                    await this.handleTransfer(body);
                    break;
                }

                default:
                    createEvent = false;
                    break;
            }

            //* CREATE EVENT ON DB AFTER EVERYTHING HAS OCCURRED
            createEvent &&
                (await paymentGatewayEventRepository.create({
                    eventUrl,
                    topic: body.topic,
                    eventId,
                }));
        }
    }

    private async fetchUserFromCustomer(customerId: string): Promise<User | null> {
        const userRepo = await this.userRepositoryGetter();
        const customer = await this.paymentGatewayService.getCustomer(customerId);
        return userRepo.findOne({
            where: {
                customId: customer?.correlationId as string,
            },
        });
    }

    private async handleCustomerVerificationUpdate(customerId: string, details: string) {
        const user = await this.fetchUserFromCustomer(customerId);
        user &&
            this.userService.sendEmail(user, EMAIL_TEMPLATES.VERIFICATION_UPDATED, {
                user,
                text: {
                    title: `Verification Update`,
                    subtitle: details,
                },
            });
    }

    private async handleFundingSourceVerificationUpdate(customerId: string, details: string) {
        const user = await this.fetchUserFromCustomer(customerId);
        user &&
            this.userService.sendEmail(user, EMAIL_TEMPLATES.FUNDING_SOURCE_VERIFICATION_UPDATED, {
                user,
                text: {
                    title: `Verification Update`,
                    subtitle: details,
                },
            });
    }

    private async handleTransfer(body: DwollaWebhookEventPayload) {
        const withdrawRequestRepo = await this.withdrawRequestRepository();
        const transfer = await this.paymentGatewayService.getTransfer(body._links.resource.href);
        const destinationSourceUrl = transfer?._links?.destination.href;
        const destinationSourceId = destinationSourceUrl?.substring(lastIndexOf(destinationSourceUrl, '/') + 1);
        let transferUrl = '';
        let isWithdraw = false;

        if (
            transfer &&
            transfer._links &&
            transfer._links['funded-transfer'] &&
            transfer._links['funded-transfer']['href']
        )
            transferUrl = transfer._links['funded-transfer']['href'];

        if (
            transfer &&
            transfer._links &&
            transfer._links['funding-transfer'] &&
            transfer._links['funding-transfer']['href']
        ) {
            transferUrl = transfer._links['funding-transfer']['href'];
            isWithdraw = true;
        }

        if (!transferUrl) return;

        const customerUrl = body._links.customer.href as string;
        const user = await this.fetchUserFromCustomer(customerUrl);
        if (user && transfer) {
            let title = '';
            let subtitle = '';
            let template: EMAIL_TEMPLATES | null = null;
            let sendEmail = true;

            const betRepo = await this.betRepositoryGetter();
            const gainRepo = await this.gainRepositoryGetter();
            const topUpRepo = await this.topUpRepositoryGetter();
            if (!isWithdraw) {
                title = 'Wallet Funding';
                template = EMAIL_TEMPLATES.BANK_TO_WALLET_TRANSFER_UPDATED;
                if (isEqual(body.topic, DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_CREATED))
                    subtitle = `You have added $${transfer?.amount.value} to your wallet. We will let you know once this is validated and ready to use.`;

                if (isEqual(body.topic, DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_COMPLETED)) {
                    subtitle = `Your transfer for $${transfer?.amount.value} to your wallet has been completed. The next step for you is to start playing.`;
                    await topUpRepo.create({
                        topUpTransferUrl: transferUrl,
                        grossAmount: +transfer.amount.value * 100,
                        //* TOP PROP WILL TAKE OVER THE STRIPE FEE
                        netAmount: +transfer.amount.value * 100,
                        userId: user.id,
                    });
                }

                if (isEqual(body.topic, DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_FAILED))
                    subtitle = `Your transfer for $${transfer?.amount.value} to your wallet could not be processed, please try again and make sure you have enough funds on your bank account.`;
            }

            if (isWithdraw) {
                title = 'Money Transfer';
                template = EMAIL_TEMPLATES.WALLET_TO_BANK_TRANSFER_UPDATED;
                let updateData: Partial<TopUp | Gain | Bet> | null = null;
                let whereUpdate: Where<TopUp | Gain | Bet> | null = null;
                let withdrawWhereUpdate: Where<WithdrawRequest> | null = null;
                let withdrawUpdateData: Partial<WithdrawRequest> | null = null;

                if (isEqual(body.topic, DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_CREATED)) sendEmail = false;
                if (isEqual(body.topic, DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_COMPLETED)) {
                    subtitle = `Your transfer for $${transfer?.amount.value} to your bank account has been completed. Hope you have enjoyed the TopProp experience.`;
                    updateData = {
                        paid: true,
                        paidAt: moment().toDate(),
                    };

                    whereUpdate = {
                        withdrawTransferUrl: transferUrl,
                        transferred: true,
                        userId: user.id,
                    };

                    withdrawUpdateData = { status: WITHDRAW_REQUEST_STATUSES.COMPLETED };
                    withdrawWhereUpdate = {
                        destinationFundingSourceId: destinationSourceId,
                        withdrawTransferUrl: transferUrl,
                        status: WITHDRAW_REQUEST_STATUSES.PROCESSING,
                    };
                }
                if (isEqual(body.topic, DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_FAILED)) {
                    subtitle = `Your transfer for $${transfer?.amount.value} to your bank account could not be processed, please reach ut to us to solve this.`;
                    updateData = {
                        paid: false,
                        payoutId: null,
                        paidAt: null,
                        transferred: false,
                        withdrawTransferUrl: null,
                        transferredAt: null,
                    };

                    whereUpdate = {
                        withdrawTransferUrl: transferUrl,
                        transferred: true,
                        userId: user.id,
                    };

                    withdrawUpdateData = { status: WITHDRAW_REQUEST_STATUSES.DENIED };
                    withdrawWhereUpdate = {
                        destinationFundingSourceId: destinationSourceId,
                        withdrawTransferUrl: transferUrl,
                        status: WITHDRAW_REQUEST_STATUSES.PENDING,
                    };
                }

                if (updateData && whereUpdate && withdrawUpdateData && withdrawWhereUpdate) {
                    await betRepo.updateAll(updateData, whereUpdate);
                    await gainRepo.updateAll(updateData, whereUpdate);
                    await topUpRepo.updateAll(updateData, whereUpdate);
                    await withdrawRequestRepo.updateAll(withdrawUpdateData, withdrawWhereUpdate);
                }
            }

            sendEmail &&
                template &&
                this.userService.sendEmail(user, template, {
                    user,
                    text: {
                        title,
                        subtitle,
                    },
                });
        }
    }
}
