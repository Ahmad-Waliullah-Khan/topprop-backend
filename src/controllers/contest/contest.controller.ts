import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { del, get, getModelSchemaRef, HttpErrors, param, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { Contender, Contest } from '@src/models';
import { ContestRepository } from '@src/repositories';
import { PlayerResultRepository } from '@src/repositories';
import { ContestPayoutService, ContestService, WalletService } from '@src/services';
import { API_ENDPOINTS, CONTEST_STATUSES, CONTEST_TYPES, MINIMUM_BET_AMOUNT, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler, MiscHelpers } from '@src/utils/helpers';
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
        @repository(PlayerResultRepository)
        public playerResultRepository: PlayerResultRepository,
        @service() private walletService: WalletService,
        @service() private contestPayoutService: ContestPayoutService,
        @service() private contestService: ContestService,
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

        // const funds = await this.walletService.userBalance(body.creatorId);

        const validationSchema = {
            creatorId: CONTEST_VALIDATORS.creatorId,
            creatorPlayerId: CONTEST_VALIDATORS.creatorPlayerId,
            claimerPlayerId: CONTEST_VALIDATORS.claimerPlayerId,
            entry: CONTEST_VALIDATORS.entry,
            winBonus: CONTEST_VALIDATORS.winBonus,
            // toRiskAmount: CONTENDER_VALIDATORS.toRiskAmount(funds, MINIMUM_BET_AMOUNT),
            // toWinAmount: CONTENDER_VALIDATORS.toWinAmount(1),
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const isPlayerAvailable = await this.contestService.checkPlayerStatus(
            body.creatorPlayerId? body.creatorPlayerId: 0,
            body.claimerPlayerId? body.claimerPlayerId: 0
        );
        if (!isPlayerAvailable) throw new HttpErrors.BadRequest(COMMON_MESSAGES.PLAYER_NOT_AVAILABLE);

        const contestData = await this.contestService.getContestCreationData(
            body.creatorPlayerId? body.creatorPlayerId: 0,
            body.claimerPlayerId ? body.claimerPlayerId : 0,
            body.entry? body.entry: 0,
            body.winBonus? body.winBonus : false,
            body.creatorId? body.creatorId: 0,
            body.creatorPlayerId? body.creatorPlayerId : 0,
            body.claimerPlayerId? body.claimerPlayerId: 0,
        );

        //TODO: pass proper data to the repository
        return {
            data: await this.contestRepository.create(contestData),
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


            contenders = [ ...contenders];
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
            return total + +current.spreadValue;
        }, 0);

        return { data: topPropRevenue };
    }

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CALCULATE_AMOUNTS)] })
    // @post(API_ENDPOINTS.CONTESTS.CALCULATE_SPREAD)
    // async calculateSpread(
    //     @requestBody()
    //     body: {
    //         playerId: number;
    //         opponentId: number;
    //         type: string;
    //     },
    // ): Promise<ICommonHttpResponse<number>> {
    //     let spread = 0;
    //
    //     const playerResult = await this.playerResultRepository.findOne({
    //         order: ['updatedat DESC'],
    //         where: {
    //             playerId: body.playerId,
    //         },
    //     });
    //
    //     const opponentResult = await this.playerResultRepository.findOne({
    //         order: ['updatedat DESC'],
    //         where: {
    //             playerId: body.opponentId,
    //         },
    //     });
    //     const playerPoints = playerResult ? playerResult.points : 0;
    //     const opponentPoints = opponentResult ? opponentResult.points : 0;
    //     if (body.type === 'creator') {
    //         spread = MiscHelpers.roundValue(opponentPoints - playerPoints, 0.5);
    //     } else {
    //         spread = MiscHelpers.roundValue(playerPoints - opponentPoints, 0.5);
    //     }
    //
    //     return { data: spread };
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CALCULATE_AMOUNTS)] })
    @post(API_ENDPOINTS.CONTESTS.CALCULATE_VALUES)
    async calculateValues(
        @requestBody()
        body: {
            playerId: number;
            opponentId: number;
            type: string;
            entry: number;
        },
    ): Promise<ICommonHttpResponse<object>> {
        const isPlayerAvailable = await this.contestService.checkPlayerStatus(body.playerId, body.opponentId);
        if (!isPlayerAvailable) throw new HttpErrors.BadRequest(COMMON_MESSAGES.PLAYER_NOT_AVAILABLE);

        const spread = await this.contestService.calculateSpread(body.playerId, body.opponentId, body.type);

        const coverWithBonus = await this.contestService.calculateCover(spread, body.entry, true);
        const coverWithoutBonus = await this.contestService.calculateCover(spread, body.entry, false);

        const winBonus = await this.contestService.calculateWinBonus(spread, body.entry);

        return {
            data: {
                withWinBonus: {
                    spread,
                    cover: coverWithBonus,
                    winBonus,
                },
                withoutWinBonus: {
                    spread,
                    cover: coverWithoutBonus,
                    winBonus: 0,
                },
            },
        };
    }
}
