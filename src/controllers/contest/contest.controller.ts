import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { del, get, patch, getModelSchemaRef, HttpErrors, param, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { Contender, Contest, Bet } from '@src/models';
import { ContestRepository, PlayerRepository, BetRepository, UserRepository } from '@src/repositories';
import { PlayerResultRepository } from '@src/repositories';
import { ContestPayoutService, ContestService, WalletService, UserService } from '@src/services';
import {
    API_ENDPOINTS,
    CONTEST_STATUSES,
    CONTEST_TYPES,
    EMAIL_TEMPLATES,
    MINIMUM_BET_AMOUNT,
    PERMISSIONS,
} from '@src/utils/constants';
import { ErrorHandler, MiscHelpers } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import {
    ICommonHttpResponse,
    IContestClaimRequest,
    IContestCreateRequest,
    ICustomUserProfile,
    IContestResponses,
} from '@src/utils/interfaces';
import { COMMON_MESSAGES, CONTEST_MESSAGES, PLAYER_MESSAGES } from '@src/utils/messages';
import { CONTENDER_VALIDATORS, CONTEST_CREATE_VALIDATORS, CONTEST_CLAIM_VALIDATOR } from '@src/utils/validators';
import { isEmpty } from 'lodash';
import moment from 'moment';
import Schema from 'validate';

export class ContestController {
    constructor(
        @repository(ContestRepository)
        public contestRepository: ContestRepository,
        @repository(BetRepository)
        public betRepository: BetRepository,
        @repository(PlayerRepository)
        public playerRepository: PlayerRepository,
        @repository(PlayerResultRepository)
        public playerResultRepository: PlayerResultRepository,
        @repository(UserRepository)
        public userRepository: UserRepository,
        @service() private walletService: WalletService,
        @service() private contestPayoutService: ContestPayoutService,
        @service() private contestService: ContestService,
        @service() private userService: UserService,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.CONTESTS.CRUD, {
        responses: {
            '200': {
                description: 'Contest model instance',
                content: {
                    'application/json': {
                        schema: {
                            message: { type: 'string' },
                            data: {
                                myContests: { type: 'array', items: getModelSchemaRef(Contest) },
                                contests: { type: 'array', items: getModelSchemaRef(Contest) },
                            },
                        },
                    },
                },
            },
        },
    })
    async create(
        @requestBody()
        body: Partial<IContestCreateRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!body.creatorId) body.creatorId = +currentUser[securityId];

        const validationSchema = {
            creatorId: CONTEST_CREATE_VALIDATORS.creatorId,
            creatorPlayerId: CONTEST_CREATE_VALIDATORS.creatorPlayerId,
            claimerPlayerId: CONTEST_CREATE_VALIDATORS.claimerPlayerId,
            entryAmount: CONTEST_CREATE_VALIDATORS.entryAmount,
            winBonus: CONTEST_CREATE_VALIDATORS.winBonus,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const isPlayerAvailable = await this.contestService.checkPlayerStatus(
            body.creatorPlayerId ? body.creatorPlayerId : 0,
            body.claimerPlayerId ? body.claimerPlayerId : 0,
        );
        if (!isPlayerAvailable) throw new HttpErrors.BadRequest(COMMON_MESSAGES.PLAYER_NOT_AVAILABLE);

        const funds = await this.walletService.userBalance(+currentUser[securityId]);
        const entryAmount = body.entryAmount || 0;
        if (funds < entryAmount * 100) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

        const winBonusFlag = false;
        const creatorPlayerId = body.creatorPlayerId || 0;
        const claimerPlayerId = body.claimerPlayerId || 0;

        const creatorPlayerData = await this.playerRepository.findById(creatorPlayerId);
        if (!creatorPlayerData) throw new HttpErrors.BadRequest(PLAYER_MESSAGES.PLAYER_NOT_FOUND);
        const claimerPlayerData = await this.playerRepository.findById(claimerPlayerId);
        if (!claimerPlayerData) throw new HttpErrors.BadRequest(PLAYER_MESSAGES.PLAYER_NOT_FOUND);

        const creatorPlayerSpread = await this.contestService.calculateSpread(
            creatorPlayerId,
            claimerPlayerId,
            'creator',
        );
        const claimerPlayerSpread = await this.contestService.calculateSpread(
            creatorPlayerId,
            claimerPlayerId,
            'claimer',
        );

        const creatorPlayerCover = await this.contestService.calculateCover(
            creatorPlayerSpread,
            entryAmount,
            winBonusFlag,
        );
        const claimerPlayerCover = await this.contestService.calculateCover(
            claimerPlayerSpread,
            entryAmount,
            winBonusFlag,
        );

        const creatorPlayerWinBonus = winBonusFlag
            ? await this.contestService.calculateWinBonus(creatorPlayerSpread, entryAmount)
            : 0;
        const claimerPlayerWinBonus = winBonusFlag
            ? await this.contestService.calculateWinBonus(claimerPlayerSpread, entryAmount)
            : 0;

        const creatorPlayerProjFantasyPoints = creatorPlayerData ? creatorPlayerData.projectedFantasyPoints : 0;
        const claimerPlayerProjFantasyPoints = claimerPlayerData ? claimerPlayerData.projectedFantasyPoints : 0;

        const creatorPlayerMaxWin = Number(creatorPlayerCover) + Number(creatorPlayerWinBonus);
        const claimerPlayerMaxWin = Number(claimerPlayerCover) + Number(claimerPlayerWinBonus);

        const spreadValue = entryAmount * 0.85;
        const mlValue = entryAmount - spreadValue;

        const contestData = new Contest();
        const userId = body.creatorId;

        contestData.creatorId = userId;
        contestData.creatorPlayerId = creatorPlayerId;
        contestData.claimerPlayerId = claimerPlayerId;
        contestData.entryAmount = entryAmount;
        contestData.creatorPlayerProjFantasyPoints = creatorPlayerProjFantasyPoints;
        contestData.claimerPlayerProjFantasyPoints = claimerPlayerProjFantasyPoints;
        contestData.creatorPlayerCover = creatorPlayerCover;
        contestData.claimerPlayerCover = claimerPlayerCover;
        contestData.creatorPlayerMaxWin = creatorPlayerMaxWin;
        contestData.claimerPlayerMaxWin = claimerPlayerMaxWin;
        contestData.creatorPlayerWinBonus = creatorPlayerWinBonus;
        contestData.claimerPlayerWinBonus = claimerPlayerWinBonus;
        contestData.creatorPlayerSpread = creatorPlayerSpread;
        contestData.claimerPlayerSpread = claimerPlayerSpread;
        contestData.spreadValue = spreadValue;
        contestData.mlValue = mlValue;
        contestData.status = CONTEST_STATUSES.OPEN;
        contestData.ended = false;

        const createdContest = await this.contestRepository.create(contestData);
        
        const bet = new Bet();

        bet.contenderId = creatorPlayerId;
        bet.userId = userId;
        bet.amount = entryAmount * 100;
        bet.contestId = createdContest.id;

        await this.betRepository.create(bet);

        const myContestFilter = {
            where: {
                and: [
                    { ended: false },
                    { or: [{ creatorId: userId }, { claimerId: userId }] },
                    {
                        or: [
                            { status: CONTEST_STATUSES.OPEN },
                            { status: CONTEST_STATUSES.MATCHED },
                            { status: CONTEST_STATUSES.UNMATCHED },
                        ],
                    },
                ],
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        };

        const contestFilter = {
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
                creatorId: { neq: userId },
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        };
        const myContests = await this.contestRepository.find(myContestFilter);
        const contests = await this.contestRepository.find(contestFilter);

        const user = await this.userRepository.findById(userId);
        const creatorPlayer = await this.playerRepository.findById(creatorPlayerId);
        const claimerPlayer = await this.playerRepository.findById(claimerPlayerId);
        this.userService.sendEmail(user, EMAIL_TEMPLATES.CONTEST_CREATED, {
            user,
            creatorPlayer,
            claimerPlayer,
            contestData,
            text: {
                title: 'Your contest has been created',
                subtitle: "We'll let you know when you match with an opponent. Contest details are listed below",
            },
        });

        return {
            message: CONTEST_MESSAGES.CREATE_SUCCESS,
            data: {
                myContests: myContests,
                contests: contests,
            },
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @patch(API_ENDPOINTS.CONTESTS.CRUD, {
        responses: {
            '200': {
                description: 'Contest model instance',
                content: {
                    'application/json': {
                        schema: {
                            message: { type: 'string' },
                            data: {
                                myContests: { type: 'array', items: getModelSchemaRef(Contest) },
                                contests: { type: 'array', items: getModelSchemaRef(Contest) },
                            },
                        },
                    },
                },
            },
        },
    })
    async claim(
        @requestBody()
        body: Partial<IContestClaimRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!body.claimerId) body.claimerId = +currentUser[securityId];

        const validationSchema = {
            contestId: CONTEST_CLAIM_VALIDATOR.contestId,
            claimerId: CONTEST_CLAIM_VALIDATOR.claimerId,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const contestId = body.contestId || 0;
        const userId = body.claimerId || 0;
        const contestData = await this.contestRepository.findById(contestId);
        if (!contestData) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.CONTEST_NOT_FOUND);

        if (contestData.claimerId) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.CONTEST_ALREADY_MATCHED);

        const funds = await this.walletService.userBalance(userId);
        const entryAmount = contestData.entryAmount || 0;
        if (funds < entryAmount * 100) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

        contestData.claimerId = body.claimerId;
        contestData.status = CONTEST_STATUSES.MATCHED;

        const updatedContest = await this.contestRepository.updateById(contestId, contestData);

        const bet = new Bet();

        bet.contenderId = contestData.claimerPlayerId;
        bet.userId = userId;
        bet.amount = contestData.entryAmount * 100;
        bet.contestId = contestId;

        await this.betRepository.create(bet);

        const myContestFilter = {
            where: {
                and: [
                    { ended: false },
                    { or: [{ creatorId: userId }, { claimerId: userId }] },
                    {
                        or: [
                            { status: CONTEST_STATUSES.OPEN },
                            { status: CONTEST_STATUSES.MATCHED },
                            { status: CONTEST_STATUSES.UNMATCHED },
                        ],
                    },
                ],
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        };

        const contestFilter = {
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
                creatorId: { neq: userId },
            },
            include: ['creator', 'claimer', 'winner', 'creatorPlayer', 'claimerPlayer'],
        };
        const myContests = await this.contestRepository.find(myContestFilter);
        const contests = await this.contestRepository.find(contestFilter);

        const user = await this.userRepository.findById(userId);
        const creatorPlayer = await this.playerRepository.findById(contestData.creatorPlayerId);
        const claimerPlayer = await this.playerRepository.findById(contestData.claimerPlayerId);
        const creatorUser = await this.userRepository.findById(contestData.creatorId);
        this.userService.sendEmail(user, EMAIL_TEMPLATES.CONTEST_CLAIMED, {
            user,
            creatorUser,
            creatorPlayer,
            claimerPlayer,
            contestData,
            text: {
                title: 'You have claimed a contest',
                subtitle: 'Contest details are listed below',
            },
        });
        this.userService.sendEmail(creatorUser, EMAIL_TEMPLATES.CONTEST_CLAIMED_BY_CLAIMER, {
            creatorUser,
            claimerPlayer,
            creatorPlayer,
            user,
            contestData,
            moment: moment,
            text: {
                title: 'TopProp - Your contest has been claimed',
                subtitle: `Contest claimed by ${user.fullName} on ${moment(contestData.updatedAt).format(
                    'dddd, MMMM Do YYYY, h:mm:ss a',
                )}`,
            },
        });

        return {
            message: CONTEST_MESSAGES.CLAIM_SUCCESS,
            data: {
                myContests: myContests,
                contests: contests,
            },
        };
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
