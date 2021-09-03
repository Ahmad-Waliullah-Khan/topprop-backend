import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Getter, inject, service } from '@loopback/core';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { Contender, Contest } from '@src/models';
import { ContestRepository, UserRepository } from '@src/repositories';
import { PaymentGatewayService } from '@src/services';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, ICustomUserProfile } from '@src/utils/interfaces';
import { COMMON_MESSAGES, CONTEST_MESSAGES, WALLET_MESSAGES } from '@src/utils/messages';
import { CONTENDER_VALIDATORS } from '@src/utils/validators';
import { isEmpty } from 'lodash';
import Schema from 'validate';

export class ContestContenderController {
    constructor(
        @repository(ContestRepository) protected contestRepository: ContestRepository,
        @repository.getter(UserRepository) protected userRepositoryGetter: Getter<UserRepository>,
        @service() private paymentGatewayService: PaymentGatewayService, // @service() private contestPayoutService: ContestPayoutService,
    ) {}

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTENDERS.VIEW_ALL_CONTENDERS)],
    })
    @get(API_ENDPOINTS.CONTESTS.CONTENDERS.CRUD, {
        responses: {
            '200': {
                description: 'Array of Contest has many Contender',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Contender) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<Contender>,
    ): Promise<ICommonHttpResponse<Contest[]>> {
        return { data: await this.contestRepository.find() };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTENDERS.CREATE_ANY_CONTENDER)],
    })
    @post(API_ENDPOINTS.CONTESTS.CONTENDERS.CRUD, {
        responses: {
            '200': {
                description: 'Contest model instance',
                content: { 'application/json': { schema: getModelSchemaRef(Contender) } },
            },
        },
    })
    async create(
        @param.path.number('id') id: typeof Contest.prototype.id,
        @requestBody()
        body: Partial<Contender>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<Contender>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!(await this.contestRepository.exists(id)))
            throw new HttpErrors.BadRequest(CONTEST_MESSAGES.CONTEST_NOT_FOUND);

        if (!body.contenderId) body.contenderId = +currentUser[securityId];
        // body.contestId = id;

        const contest = await this.contestRepository.findById(id, { include: [{ relation: 'contenders' }] });

        // if (contest.contenders.length >= 2) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.CONTEST_ALREADY_MATCHED);

        const userRepo = await this.userRepositoryGetter();
        const user = await userRepo.findById(body.contenderId);

        const funds = await this.paymentGatewayService.getTopPropBalance(user.id);

        const validationSchema = {
            // contestId: CONTENDER_VALIDATORS.contestId,
            // toWinAmount: CONTENDER_VALIDATORS.toWinAmount(1),
            contenderId: CONTENDER_VALIDATORS.contenderId,
            type: CONTENDER_VALIDATORS.type,
            toRiskAmount: CONTENDER_VALIDATORS.toRiskAmount(funds),
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        // const toWinAmount = await this.contestPayoutService.calculateToWin(
        //     contest.creatorPlayerId,
        //     +contest.claimerPlayerFantasyPoint,
        //     contest.claimerPlayerFantasyPoint,
        //     true,
        //     CONTEST_TYPES.OVER,
        // );
        // body.toWinAmount = toWinAmount;

        return {};
    }

    // @patch('/contests/{id}/contenders', {
    //     responses: {
    //         '200': {
    //             description: 'Contest.Contender PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async patch(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contender, { partial: true }),
    //             },
    //         },
    //     })
    //     contender: Partial<Contender>,
    //     @param.query.object('where', getWhereSchemaFor(Contender)) where?: Where<Contender>,
    // ): Promise<Count> {
    //     return this.contestRepository.contenders(id).patch(contender, where);
    // }

    // @del('/contests/{id}/contenders', {
    //     responses: {
    //         '200': {
    //             description: 'Contest.Contender DELETE success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async delete(
    //     @param.path.number('id') id: number,
    //     @param.query.object('where', getWhereSchemaFor(Contender)) where?: Where<Contender>,
    // ): Promise<Count> {
    //     return this.contestRepository.contenders(id).delete(where);
    // }
}
