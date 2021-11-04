import { /* inject, */ BindingScope, Getter, injectable, service } from '@loopback/core';
import { repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { TopUp, User } from '@src/models';
import { TopUpRepository, UserRepository, WithdrawRequestRepository } from '@src/repositories';
import { PaymentGatewayEventRepository } from '@src/repositories/payment-gateway-event.repository';
import { API_RESOURCES, DWOLLA_WEBHOOK_EVENTS, EMAIL_TEMPLATES, IRequestFile } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import sleep from '@src/utils/sleep';
import Dwolla from 'dwolla-v2';
import FormData from 'form-data';
import { createReadStream } from 'fs-extra';
import { find, isEqual, startsWith } from 'lodash';
import moment from 'moment';
import logger from '../utils/logger';
import { UserService } from './user.service';

@injectable({ scope: BindingScope.SINGLETON })
export class PaymentGatewayService {
    dwollaClient: Dwolla.Client;
    private dwollaApiUrl: string;
    constructor(
        @repository.getter(UserRepository) private userRepoGetter: Getter<UserRepository>,
        @repository('TopUpRepository') private topUpRepository: TopUpRepository,
        @repository('WithdrawRequestRepository') private withdrawRequestRepository: WithdrawRequestRepository,
        @repository.getter('PaymentGatewayEventRepository')
        protected paymentGatewayEventRepositoryGetter: Getter<PaymentGatewayEventRepository>,
        @service() private userService: UserService,
    ) {
        if (!process.env.DWOLLA_APP_KEY || !process.env.DWOLLA_APP_SECRET)
            throw new Error(`Must provide dwolla env variables`);

        this.dwollaClient = new Dwolla.Client({
            key: process.env.DWOLLA_APP_KEY,
            secret: process.env.DWOLLA_APP_SECRET,
            environment: isEqual(process.env.DWOLLA_ENV, 'production') ? 'production' : 'sandbox', // defaults to 'production'
        });

        this.dwollaApiUrl = isEqual(process.env.DWOLLA_ENV, 'production')
            ? 'https://api.dwolla.com'
            : 'https://api-staging.dwolla.com';
    }

    async createCustomer(data: DwollaUser): Promise<string> {
        let result = '';
        try {
            const response = await this.dwollaClient.post('customers', data);
            result = response.headers.get('location') as string;
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return result;
    }

    async upgradeCustomer(
        customerUrl: string,

        data: Pick<
            DwollaUser,
            | 'address1'
            | 'address2'
            | 'city'
            | 'phone'
            | 'postalCode'
            | 'state'
            | 'ssn'
            | 'dateOfBirth'
            | 'firstName'
            | 'lastName'
        >,
    ): Promise<void> {
        try {
            const customer = await this.getCustomer(customerUrl);
            if (customer) {
                if (customer.status === 'verified') throw new HttpErrors.BadRequest('User already verified');
                const upgradeData: Omit<DwollaUser, 'ipAddress'> = {
                    ...data,
                    type: 'personal',
                    email: customer.email,
                };
                await this.dwollaClient.post(`customers/${customer.id}`, upgradeData);
            }
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return;
    }

    async getCustomer(url: string): Promise<DwollaCustomer | null> {
        let customer: DwollaCustomer | null = null;
        if (!startsWith(url, 'https')) url = `${this.dwollaApiUrl}/customers/${url}`;
        try {
            const response = await this.dwollaClient.get(url);
            customer = response.body;
            delete customer?._links;
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return customer;
    }

    async getCustomerFundingSources(url: string): Promise<FundingSource[]> {
        let sources: FundingSource[] = [];
        try {
            const response = await this.dwollaClient.get(`${url}/funding-sources?removed=false`);
            sources = response.body._embedded['funding-sources'].map((source: DwollaFundingSource) => ({
                bankAccountType: source.bankAccountType,
                bankName: source.bankName,
                created: source.created,
                id: source.id,
                status: source.status,
                type: source.type,
                name: source.name,
            }));
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return sources;
    }

    async getFundingSource(fundingSourceId: string): Promise<FundingSource | null> {
        let mappedSource: FundingSource | null = null;
        try {
            const response = await this.dwollaClient.get(`${this.dwollaApiUrl}/funding-sources/${fundingSourceId}`);

            const source: DwollaFundingSource = response.body;
            mappedSource = {
                bankAccountType: source.bankAccountType,
                bankName: source.bankName,
                created: source.created,
                id: source.id,
                status: source.status,
                type: source.type,
                name: source.name,
            };
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return mappedSource;
    }

    async generateIavToken(url: string): Promise<string> {
        let iavToken = '';
        try {
            const response = await this.dwollaClient.post(`${url}/iav-token`);
            iavToken = response.body.token;
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return iavToken;
    }
    async removeFundingSource(fundingSource: string): Promise<void> {
        try {
            await this.dwollaClient.post(`${this.dwollaApiUrl}/funding-sources/${fundingSource}`, {
                removed: true,
            });
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return;
    }

    // async getCustomerBalance(customerUrl: string): Promise<number> {
    //     let balance = '';
    //     try {
    //         const fundingSources = await this.getCustomerFundingSources(customerUrl);
    //         const dwollaSource = find(fundingSources, source => isEqual(source.type, 'balance'));
    //         if (dwollaSource) {
    //             const response = await this.dwollaClient.get(
    //                 `${this.dwollaApiUrl}/funding-sources/${dwollaSource.id}/balance`,
    //             );
    //             balance = response.body.balance.value;
    //         } else balance = '0';
    //     } catch (error) {
    //         error.message = ErrorHandler.formatError(error);
    //         ErrorHandler.httpError(error);
    //     }
    //     return +balance * 100;
    // }

    async getTopPropBalance(userId: typeof User.prototype.id): Promise<number> {
        let totalTopUpsAMount = 0;
        let totalBetsAMount = 0;
        let totalGainsAMount = 0;

        try {
            const userRepo = await this.userRepoGetter();

            //* RETRIEVE ALL TOP-UPS WHICH HAVE NOT BEEN PAID OUT
            const topUps = await userRepo.topUps(userId).find({
                where: { transferred: false, refunded: false },
                fields: { netAmount: true },
            });
            const bets = await userRepo.bets(userId).find({
                where: { transferred: false },
                fields: { amount: true },
            });
            const gains = await userRepo.gains(userId).find({
                where: { transferred: false },
                fields: { amount: true },
            });

            totalTopUpsAMount = topUps.reduce((total, current) => {
                return total + +current.netAmount;
            }, 0);
            totalBetsAMount = bets.reduce((total, current) => {
                return total + +current.amount;
            }, 0);

            totalGainsAMount = gains.reduce((total, current) => {
                return total + +current.amount;
            }, 0);
        } catch (error) {
            ErrorHandler.httpError(error);
        }

        return totalTopUpsAMount + totalGainsAMount - totalBetsAMount;
    }

    // async addFunds(customerUrl: string, payload: AddFundsPayload): Promise<string> {
    //     let transferUrl = '';
    //     try {
    //         const fundingSources = await this.getCustomerFundingSources(customerUrl);
    //         const source = find(fundingSources, source => isEqual(source.id, payload.sourceFundingSourceId));
    //         const dwollaSource = find(fundingSources, source => isEqual(source.type, 'balance'));

    //         if (!source)
    //             throw new HttpErrors.NotFound('The funding source selected does not exist. Select another one.');
    //         if (!dwollaSource) throw new HttpErrors.BadRequest('User must be verified to fund the balance.');

    //         const transferRequest: DwollaTransfer = {
    //             _links: {
    //                 source: {
    //                     href: `${this.dwollaApiUrl}/funding-sources/${source.id}`,
    //                 },
    //                 destination: {
    //                     href: `${this.dwollaApiUrl}/funding-sources/${dwollaSource.id}`,
    //                 },
    //             },
    //             amount: {
    //                 currency: 'USD',
    //                 value: (payload.amount / 100).toFixed(2),
    //             },
    //             clearing: {
    //                 source: 'next-available',
    //                 destination: 'next-available',
    //             },
    //         };

    //         const response = await this.dwollaClient.post(`${this.dwollaApiUrl}/transfers`, transferRequest);
    //         transferUrl = response.headers.get('location') as string;
    //     } catch (error) {
    //         error.message = ErrorHandler.formatError(error);
    //         ErrorHandler.httpError(error);
    //     }
    //     return transferUrl;
    // }

    async getTransfer(transferUrl: string): Promise<DwollaTransfer | null> {
        let transfer: DwollaTransfer | null = null;
        try {
            const response = await this.dwollaClient.get(transferUrl);

            transfer = response.body;
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return transfer;
    }

    async sendFunds(
        customerUrl: string,
        type: TRANSFER_TYPES,
        amount: number,
        fundingSourceId: string,
    ): Promise<string> {
        let transferUrl = '';
        try {
            const fundingSources = await this.getCustomerFundingSources(customerUrl);
            // const customerDwollaFundingSource = this.getDwollaSource(fundingSources);

            let transfer: DwollaTransfer | null = null;
            const value = (+amount / 100).toFixed(2);

            const rootAccountUrl = await this.getRootAccount();
            if (!rootAccountUrl) throw new HttpErrors.NotFound('The TopProp root account could not be found.');
            const mainFundingSources = await this.getCustomerFundingSources(rootAccountUrl);

            const dwollaRootFundingSource = this.getDwollaSource(mainFundingSources);

            if (isEqual(type, TRANSFER_TYPES.WITHDRAW) || isEqual(type, TRANSFER_TYPES.TOP_UP)) {
                //TRANSFER FROM TOP PROP'S WALLET (DWOLLA) to BANK ACCOUNT OR FROM BANK ACCOUNT TO TOP PROP WALLET
                let isTopUp = isEqual(type, TRANSFER_TYPES.TOP_UP);

                const sourceOrDestinationFundingSource = await this.getFundingSource(fundingSourceId);
                if (!sourceOrDestinationFundingSource)
                    throw new HttpErrors.NotFound('The destination funding source could not be found. Try again.');

                transfer = {
                    _links: {
                        source: {
                            href: `${this.dwollaApiUrl}/funding-sources/${
                                isTopUp ? sourceOrDestinationFundingSource.id : dwollaRootFundingSource.id
                            }`,
                        },
                        destination: {
                            href: `${this.dwollaApiUrl}/funding-sources/${
                                isTopUp ? dwollaRootFundingSource.id : sourceOrDestinationFundingSource.id
                            }`,
                        },
                    },
                    amount: {
                        currency: 'USD',
                        value,
                    },
                    clearing: {
                        source: 'next-available',
                        destination: 'next-available',
                    },
                };
            }

            // if (isEqual(type, TRANSFER_TYPES.BET) || isEqual(type, TRANSFER_TYPES.GAIN)) {
            //     //TRANSFER FROM USERS' WALLET TO TOP PROP ROOT ACCOUNT
            //     const isBet = isEqual(type, TRANSFER_TYPES.BET);
            //     dwollaFundingSource = this.getDwollaSource(fundingSources);
            //     const rootAccountUrl = await this.getRootAccount();
            //     if (!rootAccountUrl) throw new HttpErrors.NotFound('The TopProp root account could not be found.');
            //     const mainFundingSources = await this.getCustomerFundingSources(rootAccountUrl);

            //     const dwollaRootFundingSource = this.getDwollaSource(mainFundingSources);
            //     transfer = {
            //         _links: {
            //             source: {
            //                 href: `${this.dwollaApiUrl}/funding-sources/${
            //                     isBet ? dwollaFundingSource.id : dwollaRootFundingSource.id
            //                 }`,
            //             },
            //             destination: {
            //                 href: `${this.dwollaApiUrl}/funding-sources/${
            //                     isBet ? dwollaRootFundingSource.id : dwollaFundingSource.id
            //                 }`,
            //             },
            //         },
            //         amount: {
            //             currency: 'USD',
            //             value,
            //         },
            //     };
            // }

            if (!transfer) throw new HttpErrors.NotFound('Unable to create the transfer. Try again.');

            const response = await this.dwollaClient.post(`${this.dwollaApiUrl}/transfers`, transfer);
            transferUrl = response.headers.get('location') as string;
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return transferUrl;
    }

    private getDwollaSource(fundingSources: FundingSource[]): FundingSource {
        const dwollaSource = find(fundingSources, source => isEqual(source.type, 'balance'));
        if (!dwollaSource) throw new Error('Unable to find dwolla funding source.');
        return dwollaSource;
    }

    async getRootAccount(): Promise<string | null> {
        let rootUrl: string | null = null;
        try {
            const mainAccountResponse = await this.dwollaClient.get('');
            rootUrl = mainAccountResponse.body._links.account.href;
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return rootUrl;
    }

    async uploadVerificationDocument(customerUrl: string, file: IRequestFile): Promise<void> {
        try {
            const body = new FormData();
            body.append('file', createReadStream(file.path), {
                filename: file.originalFilename,
                contentType: 'image/jpeg',
                knownLength: file.size,
            });
            body.append('documentType', 'idCard');

            await this.dwollaClient.post(`${customerUrl}/documents`, body);
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
    }

    async syncMissingTransactions() {
        const userRepo = await this.userRepoGetter();
        const users = await userRepo.find();
        let today = new Date();
        let yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        await Promise.all(
            users
                .filter(user => user._customerTokenUrl)
                .map(async (user: User) => {
                    try {
                        const response = await this.dwollaClient.get(
                            `${user._customerTokenUrl}/transfers?startDate=${
                                yesterday.toISOString().split('T')[0]
                            }&endDate=${today.toISOString().split('T')[0]}`,
                        );

                        response.body._embedded['transfers']
                            .filter(
                                (transfer: DwollaTransfer) =>
                                    transfer._links &&
                                    transfer._links.source['resource-type'] !== 'account' &&
                                    transfer._links.destination['resource-type'] !== 'customer',
                            )
                            .map(async (transfer: DwollaTransfer) => {
                                const paymentGatewayEventRepository = await this.paymentGatewayEventRepositoryGetter();
                                if (
                                    transfer._links?.source['resource-type'] === 'customer' &&
                                    transfer._links?.destination['resource-type'] === 'funding-source'
                                ) {
                                    //Withdraw Scenario
                                    if (transfer._links && transfer.status === 'processed') {
                                        const withdrawRequest = await this.withdrawRequestRepository.findOne({
                                            where: { withdrawTransferUrl: transfer._links['funding-transfer'].href },
                                        });

                                        if (withdrawRequest && withdrawRequest.status !== 'completed') {
                                            withdrawRequest.status = 'completed';
                                            await this.withdrawRequestRepository.updateById(
                                                withdrawRequest.id,
                                                withdrawRequest,
                                            );
                                            logger.info(
                                                `A withdraw transaction with transfer id:  ${withdrawRequest.id} was processed from Dwolla but not marked completed. So, marked it completed via sync transaction cron. ` +
                                                    moment().format('DD-MM-YYYY hh:mm:ss a'),
                                            );
                                        }
                                    } else if (
                                        transfer._links &&
                                        (transfer.status === 'cancelled' || transfer.status === 'failed')
                                    ) {
                                        const withdrawRequest = await this.withdrawRequestRepository.findOne({
                                            where: { withdrawTransferUrl: transfer._links.self.href },
                                        });
                                        if (withdrawRequest && withdrawRequest.status !== 'denied') {
                                            withdrawRequest.status = 'denied';
                                            await this.withdrawRequestRepository.updateById(
                                                withdrawRequest.id,
                                                withdrawRequest,
                                            );
                                            logger.info(
                                                `A withdraw transaction with transfer id:  ${withdrawRequest.id} was cancelled or failed from Dwolla but not marked denied. So, marked it denied via sync transaction cron. ` +
                                                    moment().format('DD-MM-YYYY hh:mm:ss a'),
                                            );
                                            try {
                                                if (process.env.SUPPORT_EMAIL_ADDRESS) {
                                                    this.userService.sendEmail(
                                                        user,
                                                        EMAIL_TEMPLATES.FAILED_TRANSACTION,
                                                        {
                                                            user,
                                                            message:
                                                                'WithdrawRequest with id ' +
                                                                withdrawRequest.id +
                                                                ' has following status from Dwolla: ' +
                                                                withdrawRequest.status +
                                                                '. Please audit and update ledger accordingly.',
                                                        },
                                                        process.env.SUPPORT_EMAIL_ADDRESS,
                                                    );
                                                }
                                            } catch (error) {
                                                error.message = ErrorHandler.formatError(error);
                                                ErrorHandler.httpError(error);
                                            }
                                        }
                                    }
                                } else if (transfer.id && transfer._links && transfer.status === 'processed') {
                                    //TopUp Scenario
                                    const transferURL = transfer._links.self.href;
                                    const topUp = await this.topUpRepository.findOne({
                                        where: { topUpTransferUrl: transferURL },
                                    });
                                    if (!topUp) {
                                        const eventId = transfer.id;
                                        const amount = transfer.amount.value;
                                        logger.info(
                                            `An add funds transaction with transfer id:  ${eventId} of amount $ ${amount} was processed from Dwolla but still not added to user: ${user.id} wallet. So, adding it to user's TP wallet via sync transaction cron. ` +
                                                moment().format('DD-MM-YYYY hh:mm:ss a'),
                                        );
                                        const newTopUp = new TopUp();
                                        newTopUp.grossAmount = parseFloat(amount) * 100;
                                        newTopUp.netAmount = parseFloat(amount) * 100;
                                        newTopUp.topUpTransferUrl = transferURL;
                                        newTopUp.userId = user.id;
                                        const eventUrl = transferURL;
                                        await paymentGatewayEventRepository.create({
                                            eventUrl,
                                            topic: 'customer_bank_transfer_completed',
                                            eventId,
                                        });
                                        await this.topUpRepository.create(newTopUp);
                                        logger.info(
                                            `Add funds Transfer id:  ${eventId} of amount $ ${amount} added to user: ${user.id} wallet. ` +
                                                moment().format('DD-MM-YYYY hh:mm:ss a'),
                                        );
                                    }
                                }
                                // delay 2s
                                await sleep(2000);
                            });
                    } catch (error) {
                        error.message = ErrorHandler.formatError(error);
                        ErrorHandler.httpError(error);
                    }
                }),
        );
    }

    async fetchTransfers(customerUrl: string): Promise<WalletTransfer[]> {
        let transfers: WalletTransfer[] = [];
        try {
            const response = await this.dwollaClient.get(`${customerUrl}/transfers`);
            transfers = response.body._embedded['transfers']
                .filter(
                    (transfer: DwollaTransfer) =>
                        transfer._links?.source['resource-type'] !== 'account' &&
                        transfer._links?.destination['resource-type'] !== 'customer',
                )
                .map((transfer: DwollaTransfer): WalletTransfer => {
                    let sign = 1;
                    if (
                        isEqual(transfer._links?.source['resource-type'], 'customer') &&
                        isEqual(transfer._links?.destination['resource-type'], 'funding-source')
                    )
                        sign = -1;

                    return {
                        id: transfer.id,
                        status: transfer.status,
                        amount: sign * (+transfer.amount.value * 100),
                        created: transfer.created,
                    };
                });
        } catch (error) {
            error.message = ErrorHandler.formatError(error);
            ErrorHandler.httpError(error);
        }
        return transfers;
    }

    async upsertWebhooks() {
        const response = await this.dwollaClient.get(`${this.dwollaApiUrl}/webhook-subscriptions`);
        const subscriptions = response.body._embedded['webhook-subscriptions'];

        for (let index = 0; index < subscriptions.length; index++) {
            const element = subscriptions[index];
            await this.dwollaClient.delete(`${this.dwollaApiUrl}/webhook-subscriptions/${element.id}`);
            console.log(`${element.url} - Removed`);
        }
        const webhookUrl = `${process.env.CLIENT_HOST}/api/v1/${API_RESOURCES.PAYMENT_GATEWAY}/webhooks`;
        await this.dwollaClient.post(`${this.dwollaApiUrl}/webhook-subscriptions`, {
            url: webhookUrl,
            secret: process.env.DWOLLA_WEBHOOK_SECRET,
        });
    }
}

export interface DwollaUser {
    firstName: string;
    lastName: string;
    email: string;
    ipAddress: string;
    businessName?: string;
    correlationId?: string;

    //VERIFIED USER
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
    dateOfBirth?: string;
    ssn?: string;
    type?: string;
}
export interface DwollaCustomer extends DwollaUser {
    _links?: DwollaCustomerLinks;
    id: string;
    status: string;
    created: string;
}
export interface DwollaCustomerLinks {
    [key: string]: DwollaCustomerLink;
}
export interface DwollaCustomerLink {
    href: string;
    type?: string;
    'resource-type'?: string;
}

export interface DwollaFundingSource extends FundingSource {
    _links: DwollaCustomerLinks;
    channels: string[];
    fingerPrint: string;
    iavAccountHolder: { selected: string };
    removed: boolean;
}
export interface FundingSource {
    bankAccountType: string;
    bankName: string;
    created: string;
    id: string;
    status: string;
    type: string;
    name: string;
}

export interface AddFundsPayload {
    sourceFundingSourceId: string;
    amount: number;
}

export interface DwollaWebhookEventPayload {
    id: string;
    resourceId: string;
    topic: DWOLLA_WEBHOOK_EVENTS;
    timestamp: string;
    _links: DwollaCustomerLinks;
    created: string;
}

export interface DwollaTransfer {
    id?: string;
    status?: 'processed' | 'pending' | 'cancelled' | 'failed';
    _links?: DwollaCustomerLinks;
    amount: {
        value: string;
        currency: string;
    };
    metadata?: {
        [key: string]: string;
    };
    clearing?: {
        source?: string;
        destination?: string;
    };
    achDetails?: {
        source: {
            addenda: {
                values: string[];
            };
            traceId: string;
        };
        destination: {
            addenda: {
                values: string[];
            };
            traceId: string;
        };
    };
    rtpDetails?: {
        destination?: string;
        networkId?: string;
    };
    correlationId?: string;
    individualAchId?: string;
    processingChannel?: {
        destination?: string;
    };
    created?: string;
}
export interface WalletTransfer {
    id?: string;
    status?: string;
    type?: string;
    narration?: string;
    amount: number;
    created?: string | Date;
}

export enum TRANSFER_TYPES {
    BET = 'bet',
    GAIN = 'gain',
    WITHDRAW = 'withdraw',
    TOP_UP = 'top-up',
}
