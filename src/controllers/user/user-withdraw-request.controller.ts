import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {service} from '@loopback/core';
import {Filter, repository, Where} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, post, requestBody} from '@loopback/rest';
import {Bet, Gain, TopUp, User, WithdrawRequest} from '@src/models';
import {BetRepository, GainRepository, TopUpRepository, UserRepository} from '@src/repositories';
import {
    API_ENDPOINTS,
    EMAIL_TEMPLATES,
    MINIMUM_WITHDRAW_AMOUNT,
    PERMISSIONS,
    WITHDRAW_REQUEST_STATUSES
} from '@src/utils/constants';
import {ErrorHandler, MiscHelpers} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse} from '@src/utils/interfaces';
import {USER_MESSAGES, WALLET_MESSAGES, WITHDRAW_REQUEST_MESSAGES} from '@src/utils/messages';
import {WITHDRAW_REQUEST_VALIDATORS} from '@src/utils/validators';
import moment from 'moment';
import Schema from 'validate';
import {PaymentGatewayService, UserService} from '../../services';
export class UserWithdrawRequestController {
    constructor(
        @repository(UserRepository) protected userRepository: UserRepository,
        @repository(TopUpRepository) protected topUpRepository: TopUpRepository,
        @repository(GainRepository) protected gainRepository: GainRepository,
        @repository(BetRepository) protected betRepository: BetRepository,
        @service() private paymentGatewayService: PaymentGatewayService,
        @service() private userService: UserService,
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
        @requestBody() body: { destinationFundingSourceId: string },
    ): Promise<ICommonHttpResponse<WithdrawRequest>> {
        const validationSchema = {
            destinationFundingSourceId: WITHDRAW_REQUEST_VALIDATORS.destinationFundingSourceId,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        if (!(await this.userRepository.exists(id))) throw new HttpErrors.NotFound(USER_MESSAGES.USER_NOT_FOUND);

        const user = await this.userRepository.findById(id);

        if (!user._customerTokenUrl) throw new HttpErrors.BadRequest(WALLET_MESSAGES.INVALID_WALLET);

        const funds = await this.paymentGatewayService.getTopPropBalance(user.id);

        if (funds < MINIMUM_WITHDRAW_AMOUNT)
            throw new HttpErrors.BadRequest(WITHDRAW_REQUEST_MESSAGES.INVALID_WITHDRAW_AMOUNT(MINIMUM_WITHDRAW_AMOUNT));

        const withdraw = await this.userRepository.withdrawRequests(id).create({
            status: WITHDRAW_REQUEST_STATUSES.PENDING,
            netAmount: funds,
            brutAmount: funds,
            destinationFundingSourceId: body.destinationFundingSourceId,
        });

        const transferUpdate: Partial<TopUp | Bet | Gain> = {
            withdrawRequestId: withdraw.id,
            transferred: true,
            transferredAt: moment().toDate(),
        };
        const whereUpdate: Where<TopUp | Bet | Gain> = {
            userId: user.id,
            transferred: false,
            paid: false,
        };

        await this.topUpRepository.updateAll(transferUpdate, whereUpdate);
        await this.betRepository.updateAll(transferUpdate, whereUpdate);
        await this.gainRepository.updateAll(transferUpdate, whereUpdate);

        await this.userService.sendEmail(user as User, EMAIL_TEMPLATES.WITHDRAW_REQUEST_CREATED, {
            user: user,
            text: {
                title: 'Withdraw Request Created',
                subtitle: `Your withdraw request of ${new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(MiscHelpers.c2d(funds))} was created and is being processed, we will keep you in the loop.`,
            },
        });

        return {
            message: 'Withdraw request created',
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
