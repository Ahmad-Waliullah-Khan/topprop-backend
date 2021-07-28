import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, patch } from '@loopback/rest';
import { Bet, Gain, TopUp, User, WithdrawRequest } from '@src/models';
import { BetRepository, GainRepository, TopUpRepository, WithdrawRequestRepository } from '@src/repositories';
import { StripeService, UserService } from '@src/services';
import { API_ENDPOINTS, EMAIL_TEMPLATES, PERMISSIONS, WITHDRAW_REQUEST_STATUSES } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { WITHDRAW_REQUEST_MESSAGES } from '@src/utils/messages';
import { isEqual } from 'lodash';
import moment from 'moment';

export class WithdrawRequestController {
    constructor(
        @repository(WithdrawRequestRepository)
        public withdrawRequestRepository: WithdrawRequestRepository,
        @repository(BetRepository)
        private betRepository: BetRepository,
        @repository(GainRepository)
        private gainRepository: GainRepository,
        @repository(TopUpRepository)
        private topUpRepository: TopUpRepository,
        @service() protected stripeService: StripeService,
        @service() protected userService: UserService,
    ) {}

    // @post(API_ENDPOINTS.WITHDRAW_REQUESTS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'WithdrawRequest model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(WithdrawRequest) } },
    //         },
    //     },
    // })
    // async create(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(WithdrawRequest, {
    //                     title: 'NewWithdrawRequest',
    //                     exclude: ['id'],
    //                 }),
    //             },
    //         },
    //     })
    //     withdrawRequest: Omit<WithdrawRequest, 'id'>,
    // ): Promise<WithdrawRequest> {
    //     return this.withdrawRequestRepository.create(withdrawRequest);
    // }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.WITHDRAW_REQUESTS.COUNT_WITHDRAW_REQUESTS)],
    })
    @get(API_ENDPOINTS.WITHDRAW_REQUESTS.COUNT, {
        responses: {
            '200': {
                description: 'WithdrawRequest model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(WithdrawRequest) where?: Where<WithdrawRequest>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.withdrawRequestRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.WITHDRAW_REQUESTS.VIEW_ALL_WITHDRAW_REQUESTS)],
    })
    @get(API_ENDPOINTS.WITHDRAW_REQUESTS.CRUD, {
        responses: {
            '200': {
                description: 'Array of WithdrawRequest model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(WithdrawRequest, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(
        @param.filter(WithdrawRequest) filter?: Filter<WithdrawRequest>,
    ): Promise<ICommonHttpResponse<WithdrawRequest[]>> {
        return { data: await this.withdrawRequestRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.WITHDRAW_REQUESTS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'WithdrawRequest PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(WithdrawRequest, { partial: true }),
    //             },
    //         },
    //     })
    //     withdrawRequest: WithdrawRequest,
    //     @param.where(WithdrawRequest) where?: Where<WithdrawRequest>,
    // ): Promise<Count> {
    //     return this.withdrawRequestRepository.updateAll(withdrawRequest, where);
    // }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.WITHDRAW_REQUESTS.VIEW_ANY_WITHDRAW_REQUEST)],
    })
    @get(API_ENDPOINTS.WITHDRAW_REQUESTS.BY_ID, {
        responses: {
            '200': {
                description: 'WithdrawRequest model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(WithdrawRequest, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(WithdrawRequest, { exclude: 'where' }) filter?: FilterExcludingWhere<WithdrawRequest>,
    ): Promise<ICommonHttpResponse<WithdrawRequest>> {
        return { data: await this.withdrawRequestRepository.findById(id, filter) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.WITHDRAW_REQUESTS.UPDATE_ANY_WITHDRAW_REQUEST)],
    })
    @patch(API_ENDPOINTS.WITHDRAW_REQUESTS.ACCEPT, {
        responses: {
            '204': {
                description: 'WithdrawRequest PATCH success',
            },
        },
    })
    async accept(@param.path.number('id') id: number): Promise<ICommonHttpResponse | undefined> {
        if (!(await this.withdrawRequestRepository.exists(id)))
            throw new HttpErrors.NotFound(WITHDRAW_REQUEST_MESSAGES.WITHDRAW_REQUEST_NOT_FOUND);

        try {
            const withdraw = await this.withdrawRequestRepository.findById(id, { include: [{ relation: 'user' }] });
            if (!isEqual(withdraw.status, WITHDRAW_REQUEST_STATUSES.PENDING))
                throw new HttpErrors.BadRequest(WITHDRAW_REQUEST_MESSAGES.INVALID_WITHDRAW_STATUS(withdraw.status));

            const transfer = await this.stripeService.stripe.transfers.create({
                amount: withdraw.netAmount,
                destination: withdraw.user?._connectToken as string,
                currency: 'usd',
                description: `Transfer created for user ${withdraw.user?.username}`,
                metadata: {
                    userId: (withdraw.user as User).id.toString(),
                    userEmail: (withdraw.user as User).email,
                    username: (withdraw.user as User).username,
                    withdrawRequestId: withdraw.id.toString(),
                },
            });

            // await this.stripeService.stripe.payouts.create(
            //     {
            //         amount: withdraw.amount,
            //         description: `Payout to the user ${withdraw.user?.username}`,
            //         currency: 'usd',
            //         metadata: {
            //             userId: (withdraw.user as User).id.toString(),
            //             userEmail: (withdraw.user as User).email,
            //             username: (withdraw.user as User).username,
            //             withdrawRequestId: withdraw.id.toString(),
            //         },
            //     },
            //     { stripeAccount: withdraw.user?._connectToken as string },
            // );

            await this.withdrawRequestRepository.updateById(withdraw.id, {
                acceptedAt: moment().toDate(),
                status: WITHDRAW_REQUEST_STATUSES.ACCEPTED,
            });

            const transferUpdate: Partial<TopUp | Bet | Gain> = {
                transferId: transfer.id,
                transferred: true,
                transferredAt: moment().toDate(),
            };
            const whereUpdate: Where<TopUp | Bet | Gain> = { userId: withdraw.userId, transferred: false, paid: false };

            await this.topUpRepository.updateAll(transferUpdate, whereUpdate);
            await this.betRepository.updateAll(transferUpdate, whereUpdate);
            await this.gainRepository.updateAll(transferUpdate, whereUpdate);

            this.userService.sendEmail(withdraw.user as User, EMAIL_TEMPLATES.WITHDRAW_REQUEST_ACCEPTED, {
                user: withdraw.user,
                text: {
                    title: "TopProp - Withdraw Request Accepted",
                    subtitle: "Your withdraw request was accepted and your funds will be in you bank account very soon, we will keep you in the loop."
                }
            });

            return { message: 'Withdraw accepted.' };
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.WITHDRAW_REQUESTS.UPDATE_ANY_WITHDRAW_REQUEST)],
    })
    @patch(API_ENDPOINTS.WITHDRAW_REQUESTS.DENY, {
        responses: {
            '204': {
                description: 'WithdrawRequest PATCH success',
            },
        },
    })
    async deny(@param.path.number('id') id: number): Promise<ICommonHttpResponse> {
        if (!(await this.withdrawRequestRepository.exists(id)))
            throw new HttpErrors.NotFound(WITHDRAW_REQUEST_MESSAGES.WITHDRAW_REQUEST_NOT_FOUND);

        const withdraw = await this.withdrawRequestRepository.findById(id, { include: [{ relation: 'user' }] });
        if (!isEqual(withdraw.status, WITHDRAW_REQUEST_STATUSES.PENDING))
            throw new HttpErrors.BadRequest(WITHDRAW_REQUEST_MESSAGES.INVALID_WITHDRAW_STATUS(withdraw.status));

        await this.withdrawRequestRepository.updateById(withdraw.id, {
            deniedAt: moment().toDate(),
            deniedReason: 'Admin has denied the withdraw.',
            status: WITHDRAW_REQUEST_STATUSES.DENIED,
        });
        this.userService.sendEmail(withdraw.user as User, EMAIL_TEMPLATES.WITHDRAW_REQUEST_DENIED, {
            user: withdraw.user,
            text: {
                title: "TopProp - Withdraw Request Denied",
                subtitle: "Your withdraw request was denied please reach out to us for more details. Do not worry, your funds are still in your account."
            }
        });

        return { message: 'Withdraw denied.' };
    }

    // @put(API_ENDPOINTS.WITHDRAW_REQUESTS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'WithdrawRequest PUT success',
    //         },
    //     },
    // })
    // async replaceById(
    //     @param.path.number('id') id: number,
    //     @requestBody() withdrawRequest: WithdrawRequest,
    // ): Promise<void> {
    //     await this.withdrawRequestRepository.replaceById(id, withdrawRequest);
    // }

    // @del(API_ENDPOINTS.WITHDRAW_REQUESTS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'WithdrawRequest DELETE success',
    //         },
    //     },
    // })
    // async deleteById(@param.path.number('id') id: number): Promise<void> {
    //     await this.withdrawRequestRepository.deleteById(id);
    // }
}
