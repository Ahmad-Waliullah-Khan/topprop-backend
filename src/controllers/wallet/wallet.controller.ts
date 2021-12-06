import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import momenttz from 'moment-timezone';
import { repository } from '@loopback/repository';
import { del, get, HttpErrors, param, patch, post, Request, requestBody, RestBindings } from '@loopback/rest';
import { User } from '@src/models';
import { TopUpRepository, UserRepository, WithdrawRequestRepository } from '@src/repositories';
import {
    AddFundsPayload,
    DwollaCustomer,
    DwollaUser,
    FundingSource,
    MultiPartyFormService,
    PaymentGatewayService,
    TRANSFER_TYPES,
    UserService,
    WalletTransfer,
} from '@src/services';
import { API_ENDPOINTS, FILE_NAMES, PERMISSIONS, WITHDRAW_REQUEST_STATUSES, TIMEZONE } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { USER_MESSAGES, WALLET_MESSAGES } from '@src/utils/messages';
import { WALLET_VALIDATORS } from '@src/utils/validators';
import { isEmpty, isEqual } from 'lodash';
import { nanoid } from 'nanoid';
import moment from 'moment';
import Schema from 'validate';

export class WalletController {
    constructor(
        @repository(UserRepository)
        private userRepository: UserRepository,
        @repository(TopUpRepository)
        private topUpRepository: TopUpRepository,
        @repository('WithdrawRequestRepository') private withdrawRequestRepository: WithdrawRequestRepository,
        @service() protected paymentGatewayService: PaymentGatewayService,
        @service() protected userService: UserService,
        @service() protected multipartyFormService: MultiPartyFormService,
    ) {}

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_WALLET_INFO)],
    })
    @get(API_ENDPOINTS.USERS.WALLET.CRUD)
    async fetchWalletInfo(
        @param.path.number('id') id: typeof User.prototype.id,
        @inject(RestBindings.Http.REQUEST) req: Request,
    ): Promise<ICommonHttpResponse<DwollaCustomer | null> | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);

            if (!user._customerTokenUrl) {
                const customId = nanoid();
                const [firstName, lastName] = user.splittedName;
                const dwollaCustomerUrl = await this.paymentGatewayService.createCustomer({
                    firstName: firstName ?? 'N/A',
                    lastName: lastName ?? 'N/A',
                    email: user.email,
                    ipAddress: req.ip,
                    correlationId: customId,
                });
                user._customerTokenUrl = dwollaCustomerUrl;
                user.customId = customId;
                await this.userRepository.save(user);
            }

            const customer = await this.paymentGatewayService.getCustomer(user._customerTokenUrl as string);

            return { data: customer };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_WALLET_INFO)],
    })
    @patch(API_ENDPOINTS.USERS.WALLET.CRUD)
    async upgradeWallet(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody()
        body: Pick<
            DwollaUser,
            'address1' | 'city' | 'phone' | 'postalCode' | 'state' | 'ssn' | 'dateOfBirth' | 'firstName' | 'lastName'
        >,
    ): Promise<ICommonHttpResponse | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);
            if (!user._customerTokenUrl) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);
            const currentTime = momenttz.tz(`${body.dateOfBirth}T12:00:00`, TIMEZONE).toDate();
            user.dateOfBirth = currentTime;
            await this.userRepository.save(user);

            await this.paymentGatewayService.upgradeCustomer(user._customerTokenUrl, body);

            return { message: 'Upgraded' };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.GENERATE_ACCOUNT_VERIFICATION_TOKEN)],
    })
    @post(API_ENDPOINTS.USERS.WALLET.ACCOUNT_VERIFICATION_TOKEN)
    async generateIavToken(
        @param.path.number('id') id: typeof User.prototype.id,
    ): Promise<ICommonHttpResponse<string> | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);

            if (!user._customerTokenUrl) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            let iavToken = await this.paymentGatewayService.generateIavToken(user._customerTokenUrl as string);

            return { data: iavToken };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_FUNDING_SOURCE)] })
    @get(API_ENDPOINTS.USERS.WALLET.FUNDING_SOURCES.CRUD)
    async fetchFundingSources(
        @param.path.number('id') id: typeof User.prototype.id,
    ): Promise<ICommonHttpResponse<FundingSource[]> | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);

            let fundingSources: FundingSource[] = [];
            if (user._customerTokenUrl)
                fundingSources = await this.paymentGatewayService.getCustomerFundingSources(user._customerTokenUrl);

            return { data: fundingSources.filter(source => !isEqual(source.type, 'balance')) };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_TRANSFER)] })
    @get(API_ENDPOINTS.USERS.WALLET.TRANSFERS.CRUD)
    async fetchTransfers(
        @param.path.number('id') id: typeof User.prototype.id,
    ): Promise<ICommonHttpResponse<WalletTransfer[]> | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);

            if (!user._customerTokenUrl) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            const transfers = await this.paymentGatewayService.fetchTransfers(user._customerTokenUrl);

            const topUps = await this.topUpRepository.find({
                where: {
                    and: [{ userId: id }],
                },
            });

            const withdrawRequests = await this.withdrawRequestRepository.find({
                where: {
                    and: [{ userId: id }],
                },
            });

            const processedDeposits = topUps.map(deposit => {
                return {
                    id: `${deposit.id.toString()}_deposit`,
                    status: 'processed',
                    narration: deposit.topUpTransferUrl === null ? 'TopProp Rewards' : 'User Deposit',
                    type: 'deposit',
                    amount: deposit.netAmount,
                    created: deposit.createdAt,
                };
            });

            const processedWithdrawals = withdrawRequests.map(withdrawal => {
                return {
                    id: `${withdrawal.id.toString()}_withdrawal`,
                    status: withdrawal.status,
                    type: 'withdrawal',
                    narration: 'User Withdrawal',
                    amount: withdrawal.netAmount,
                    created: withdrawal.createdAt,
                };
            });

            const mergedTransactions = [...processedDeposits, ...processedWithdrawals].sort(
                (transaction1: WalletTransfer, transaction2: WalletTransfer) => {
                    const dateA = moment(transaction1.created);
                    const dateB = moment(transaction2.created);
                    return dateB.diff(dateA);
                },
            );

            return { data: mergedTransactions };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.VIEW_ANY_WALLET_BALANCE)] })
    @get(API_ENDPOINTS.USERS.WALLET.FUNDS.CRUD)
    async fetchFunds(
        @param.path.number('id') id: typeof User.prototype.id,
    ): Promise<ICommonHttpResponse<number> | undefined> {
        try {
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);
            let balance = 0;
            // if (user._customerTokenUrl)
            balance = await this.paymentGatewayService.getTopPropBalance(user.id);

            return { data: balance };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.FUND_ANY_WALLET)] })
    @post(API_ENDPOINTS.USERS.WALLET.FUNDS.CRUD)
    async addFunds(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody()
        body: AddFundsPayload,
    ): Promise<ICommonHttpResponse | undefined> {
        try {
            const validationSchema = {
                amount: WALLET_VALIDATORS.amount,
                sourceFundingSourceId: WALLET_VALIDATORS.sourceFundingSourceId,
            };

            const validation = new Schema(validationSchema, { strip: true });
            const validationErrors = validation.validate(body);
            if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));
            if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
            const user = await this.userRepository.findById(id);
            if (!user._customerTokenUrl) throw new HttpErrors.NotFound(WALLET_MESSAGES.MISSING_WALLET);

            const startDate = moment().startOf('month').format();
            const endDate = moment().endOf('month').format();

            const topUps = await this.topUpRepository.find({
                where: {
                    and: [{ createdAt: { gte: startDate } }, { createdAt: { lte: endDate } }, { userId: id }],
                },
            });

            const signUpState = user.signUpState || '';
            const signInState = user.lastLoginState || '';

            const statePermissions = await this.userService.statePermissions(signUpState, signInState);

            const stateDepositLimit = statePermissions.weeklyDepositLimit;

            const topupTotal = topUps.reduce(
                (previousValue, currentValue) => previousValue + Number(currentValue.grossAmount),
                0,
            );

            const depositAmount = Number(body.amount);

            if (stateDepositLimit !== 0) {
                if (topupTotal + depositAmount > stateDepositLimit) {
                    const balance = stateDepositLimit - topupTotal;
                    throw new HttpErrors.BadRequest(WALLET_MESSAGES.WEEKLY_DEPOSIT_LIMIT(balance));
                }
            }

            await this.paymentGatewayService.sendFunds(
                user._customerTokenUrl,
                TRANSFER_TYPES.TOP_UP,
                body.amount,
                body.sourceFundingSourceId,
            );

            return { message: `Funds Added. We will let you know once your funds are ready to use.` };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.REMOVE_ANY_FUNDING_SOURCE)] })
    @del(API_ENDPOINTS.USERS.WALLET.FUNDING_SOURCES.BY_ID)
    async removeFundingSource(
        @param.path.number('id') id: typeof User.prototype.id,
        @param.path.string('fundingSourceId') fundingSourceId: string,
    ): Promise<ICommonHttpResponse | undefined> {
        if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
        const user = await this.userRepository.findById(id);

        if (!user._customerTokenUrl) throw new HttpErrors.BadRequest(WALLET_MESSAGES.INVALID_WALLET);

        const withdrawRequests = await this.withdrawRequestRepository.find({
            where: {
                and: [
                    { userId: id },
                    {
                        or: [
                            { status: WITHDRAW_REQUEST_STATUSES.PENDING },
                            { status: WITHDRAW_REQUEST_STATUSES.APPROVED },
                            { status: WITHDRAW_REQUEST_STATUSES.PROCESSING },
                        ],
                    },
                ],
            },
        });

        if (withdrawRequests.length > 0) throw new HttpErrors.BadRequest(WALLET_MESSAGES.OPEN_WITHDRAW_REQUEST);

        try {
            await this.paymentGatewayService.removeFundingSource(fundingSourceId);
            return { message: 'Funding source removed.' };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.USERS.UPLOAD_VERIFICATION_FILE)] })
    @post(API_ENDPOINTS.USERS.WALLET.VERIFICATION_FILE)
    async uploadVerificationFile(
        @param.path.number('id') id: typeof User.prototype.id,
        @requestBody.file()
        req: Request,
    ): Promise<ICommonHttpResponse | undefined> {
        if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);
        const user = await this.userRepository.findById(id);

        if (!user._customerTokenUrl) throw new HttpErrors.BadRequest(WALLET_MESSAGES.INVALID_WALLET);

        try {
            const { files, fields } = await this.multipartyFormService.getFilesAndFields(req, '10MB');

            if (isEmpty(files)) {
                throw new HttpErrors.BadRequest(WALLET_MESSAGES.INVALID_VERIFICATION_FILE);
            }

            const verificationFile = files[FILE_NAMES.VERIFICATION_FILE];
            if (!verificationFile) {
                this.multipartyFormService.removeFiles(files);
                throw new HttpErrors.BadRequest(WALLET_MESSAGES.INVALID_VERIFICATION_FILE_SIDE);
            }

            const allowedContentType = 'image';

            let fileContentType = verificationFile.headers['content-type'];

            if (!this.multipartyFormService.isContentType(allowedContentType, fileContentType)) {
                this.multipartyFormService.removeFiles(files);
                throw new HttpErrors.UnsupportedMediaType(WALLET_MESSAGES.INVALID_VERIFICATION_FILE_TYPE);
            }
            await this.paymentGatewayService.uploadVerificationDocument(user._customerTokenUrl, verificationFile);

            //* UPDATE USER INFORMATION ABOUT THE VERIFICATION FILE
            await this.userRepository.updateById(id, {
                verificationFileUploaded: true,
                verificationFileName: verificationFile.originalFilename,
            });
            this.multipartyFormService.removeFiles(files);

            return {
                message: `Verification file uploaded and attached. Please be pending until the validation.`,
            };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }
}
