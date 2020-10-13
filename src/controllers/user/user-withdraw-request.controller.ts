import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, post } from '@loopback/rest';
import { User, WithdrawRequest } from '@src/models';
import { UserRepository } from '@src/repositories';
import { StripeService, WalletService } from '@src/services';
import { API_ENDPOINTS, MINIMUM_WITHDRAW_AMOUNT, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { USER_MESSAGES, WALLET_MESSAGES, WITHDRAW_REQUEST_MESSAGES } from '@src/utils/messages';
export class UserWithdrawRequestController {
    constructor(
        @repository(UserRepository) protected userRepository: UserRepository,
        @service() private walletService: WalletService,
        @service() private stripeService: StripeService,
    ) {}

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.WITHDRAW_REQUESTS.VIEW_ALL_WITHDRAW_REQUESTS)],
    })
    @get(API_ENDPOINTS.USERS.WITHDRAW_REQUESTS.CRUD, {
        responses: {
            '200': {
                description: 'Array of User has many WithdrawRequest',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(WithdrawRequest) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<WithdrawRequest>,
    ): Promise<ICommonHttpResponse<WithdrawRequest[]>> {
        return { data: await this.userRepository.withdrawRequests(id).find(filter) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.WITHDRAW_REQUESTS.CREATE_ANY_WITHDRAW_REQUESTS)],
    })
    @post(API_ENDPOINTS.USERS.WITHDRAW_REQUESTS.CRUD)
    async createWithdrawRequest(
        @param.path.number('id') id: typeof User.prototype.id,
    ): Promise<ICommonHttpResponse<WithdrawRequest>> {
        if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

        const user = await this.userRepository.findById(id);

        if (!user._connectToken) throw new HttpErrors.BadRequest(WALLET_MESSAGES.INVALID_WALLET);

        const connectAccount = await this.stripeService.stripe.accounts.retrieve(user._connectToken);

        if (!connectAccount.external_accounts?.data.length)
            throw new HttpErrors.BadRequest(WALLET_MESSAGES.NO_PAYOUT_METHODS);

        const usersBalance = await this.walletService.userBalance(id);
        const amountAfterFees = this.stripeService.amountAfterFees(usersBalance);

        if (amountAfterFees < MINIMUM_WITHDRAW_AMOUNT)
            throw new HttpErrors.BadRequest(WITHDRAW_REQUEST_MESSAGES.INVALID_WITHDRAW_AMOUNT(amountAfterFees));

        return {
            data: await this.userRepository
                .withdrawRequests(id)
                .create({ netAmount: amountAfterFees, brutAmount: usersBalance }),
        };
    }

    /* @patch('/users/{id}/withdraw-requests', {
        responses: {
            '200': {
                description: 'User.WithdrawRequest PATCH success count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async patch(
        @param.path.number('id') id: number,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(WithdrawRequest, { partial: true }),
                },
            },
        })
        withdrawRequest: Partial<WithdrawRequest>,
        @param.query.object('where', getWhereSchemaFor(WithdrawRequest)) where?: Where<WithdrawRequest>,
    ): Promise<Count> {
        return this.userRepository.withdrawRequests(id).patch(withdrawRequest, where);
    }

    @del('/users/{id}/withdraw-requests', {
        responses: {
            '200': {
                description: 'User.WithdrawRequest DELETE success count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async delete(
        @param.path.number('id') id: number,
        @param.query.object('where', getWhereSchemaFor(WithdrawRequest)) where?: Where<WithdrawRequest>,
    ): Promise<Count> {
        return this.userRepository.withdrawRequests(id).delete(where);
    } */
}
