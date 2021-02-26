import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { del, get, getModelSchemaRef, HttpErrors, param, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { Contender, Contest } from '@src/models';
import { ContestRepository } from '@src/repositories';
import { ContestPayoutService, WalletService } from '@src/services';
import { API_ENDPOINTS, CONTEST_STATUSES, CONTEST_TYPES, MINIMUM_BET_AMOUNT, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import {
    ICalculateRiskToMatchRequest,
    ICalculateToWinRequest,
    ICommonHttpResponse,
    IContestRequest,
    ICustomUserProfile,
} from '@src/utils/interfaces';
import { COMMON_MESSAGES } from '@src/utils/messages';
import { CONTENDER_VALIDATORS, CONTEST_VALIDATORS } from '@src/utils/validators';
import { isEmpty } from 'lodash';
import moment from 'moment';
import Schema from 'validate';

export class ContestController {
    constructor(
        @repository(ContestRepository)
        public contestRepository: ContestRepository,
        @service() private walletService: WalletService,
        @service() private contestPayoutService: ContestPayoutService,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.CONTESTS.CRUD, {
        responses: {
            '200': {
                description: 'Contest model instance',
                content: { 'application/json': { schema: getModelSchemaRef(Contest) } },
            },
        },
    })
    async create(
        @requestBody()
        body: Partial<IContestRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<Contest>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!body.creatorId) body.creatorId = +currentUser[securityId];

        const funds = await this.walletService.userBalance(body.creatorId);

        const validationSchema = {
            creatorId: CONTEST_VALIDATORS.creatorId,
            playerId: CONTEST_VALIDATORS.playerId,
            gameId: CONTEST_VALIDATORS.gameId,
            fantasyPoints: CONTEST_VALIDATORS.fantasyPoints,
            scoring: CONTEST_VALIDATORS.scoring,
            type: CONTENDER_VALIDATORS.type,
            toRiskAmount: CONTENDER_VALIDATORS.toRiskAmount(funds, MINIMUM_BET_AMOUNT),
            // toWinAmount: CONTENDER_VALIDATORS.toWinAmount(1),
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const contestType = body.type;
        const toRiskAmount = body.toRiskAmount;
        const toWinAmount = await this.contestPayoutService.calculateToWin(
            body.playerId as number,
            body.fantasyPoints as number,
            body.toRiskAmount,
            false,
            body.type as CONTEST_TYPES,
        );

        delete body.type;
        delete body.toRiskAmount;
        delete body.toWinAmount;

        return {
            data: await this.contestRepository.create(body, {
                creatorId: body.creatorId,
                contestType,
                toRiskAmount,
                toWinAmount,
                assignMAxRiskAmount: true,
            }),
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.COUNT_CONTESTS)] })
    @get(API_ENDPOINTS.CONTESTS.COUNT, {
        responses: {
            '200': {
                description: 'Contest model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(Contest) where?: Where<Contest>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.contestRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS)] })
    @get(API_ENDPOINTS.CONTESTS.CRUD, {
        responses: {
            '200': {
                description: 'Array of Contest model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(Contest, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(Contest) filter?: Filter<Contest>): Promise<ICommonHttpResponse<Contest[]>> {
        return { data: await this.contestRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.CONTESTS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Contest PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contest, { partial: true }),
    //             },
    //         },
    //     })
    //     contest: Contest,
    //     @param.where(Contest) where?: Where<Contest>,
    // ): Promise<Count> {
    //     return this.contestRepository.updateAll(contest, where);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ANY_CONTEST)] })
    @get(API_ENDPOINTS.CONTESTS.BY_ID, {
        responses: {
            '200': {
                description: 'Contest model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Contest, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(Contest, { exclude: 'where' }) filter?: FilterExcludingWhere<Contest>,
    ): Promise<ICommonHttpResponse<Contest>> {
        return { data: await this.contestRepository.findById(id, filter) };
    }

    // @patch(API_ENDPOINTS.CONTESTS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Contest PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contest, { partial: true }),
    //             },
    //         },
    //     })
    //     contest: Contest,
    // ): Promise<void> {
    //     await this.contestRepository.updateById(id, contest);
    // }

    // @put(API_ENDPOINTS.CONTESTS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Contest PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() contest: Contest): Promise<void> {
    //     await this.contestRepository.replaceById(id, contest);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.DELETE_ANY_CONTEST)] })
    @del(API_ENDPOINTS.CONTESTS.BY_ID, {
        responses: {
            '204': {
                description: 'Contest DELETE success',
            },
        },
    })
    async deleteById(@param.path.number('id') id: number): Promise<void> {
        await this.contestRepository.deleteById(id);
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CALCULATE_AMOUNTS)] })
    @post(API_ENDPOINTS.CONTESTS.CALCULATE_TO_WIN, {
        responses: {
            '200': {
                description: 'Calculate to win amount',
            },
        },
    })
    async calculateToWin(
        @requestBody()
        body: ICalculateToWinRequest,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<number>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const funds = await this.walletService.userBalance(+currentUser[securityId]);

        const validationSchema = {
            playerId: CONTEST_VALIDATORS.playerId,
            fantasyPoints: CONTEST_VALIDATORS.fantasyPoints,
            toRiskAmount: CONTENDER_VALIDATORS.toRiskAmount(funds),
            matching: CONTENDER_VALIDATORS.matching,
            type: CONTENDER_VALIDATORS.type,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const toWin = await this.contestPayoutService.calculateToWin(
            body.playerId,
            body.fantasyPoints,
            body.toRiskAmount,
            body.matching,
            body.type,
        );
        return { data: toWin };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CALCULATE_AMOUNTS)] })
    @post(API_ENDPOINTS.CONTESTS.CALCULATE_RISK_TO_MATCH, {
        responses: {
            '200': {
                description: 'Calculate risk amount to match contest',
            },
        },
    })
    async calculateRiskAmountToMatch(
        @requestBody()
        body: ICalculateRiskToMatchRequest,
    ): Promise<ICommonHttpResponse<number>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            playerId: CONTEST_VALIDATORS.playerId,
            fantasyPoints: CONTEST_VALIDATORS.fantasyPoints,
            initialRiskAmount: CONTENDER_VALIDATORS.initialRiskAmount,
            type: CONTENDER_VALIDATORS.type,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const riskAmountToMatch = await this.contestPayoutService.calculateRiskAmountToMatch(
            body.playerId,
            body.fantasyPoints,
            body.type,
            body.initialRiskAmount,
        );
        return { data: riskAmountToMatch };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CALCULATE_AMOUNTS)] })
    @post(API_ENDPOINTS.CONTESTS.CALCULATE_TOTAL_TO_WIN)
    async calculateTotalToWinWithinDays(
        @requestBody()
        body: {
            wonOnly: boolean;
            filter?: Filter<Contest>;
        },
    ): Promise<ICommonHttpResponse<number>> {
        let totalToWinAmount = 0;

        const contests = await this.contestRepository.find(body.filter);

        let contenders: Contender[] = [];

        for (let index = 0; index < contests.length; index++) {
            const contest = contests[index];

            let localContenders = contest.contenders.filter(contender => {
                if (body.wonOnly) return contender.winner;
                else return true;
            });
            contenders = [...localContenders, ...contenders];
        }

        totalToWinAmount = contenders.reduce((total, current) => {
            return total + +current.toWinAmount;
        }, 0);

        return { data: totalToWinAmount };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CALCULATE_AMOUNTS)] })
    @post(API_ENDPOINTS.CONTESTS.CALCULATE_TOP_PROP_REVENUE)
    async calculateTopPropRevenue(
        @requestBody()
        body: {
            days: number;
        },
    ): Promise<ICommonHttpResponse<number>> {
        let topPropRevenue = 0;
        let defaultWhere: Where<Contest> = {
            and: [{ or: [{ status: CONTEST_STATUSES.CLOSED }, { status: CONTEST_STATUSES.MATCHED }] }],
        };
        if (body.days > 0) {
            defaultWhere.and.push({ createdAt: { gte: moment().subtract(body.days, 'days').toDate() } });
        }
        const contests = await this.contestRepository.find({
            where: defaultWhere,
        });

        topPropRevenue = contests.reduce((total, current) => {
            return total + +current.topPropRevenue;
        }, 0);

        return { data: topPropRevenue };
    }
}
