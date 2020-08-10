import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Filter, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Contender, Contest } from '@src/models';
import { ContenderRepository, UserRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { isNull, isUndefined, merge } from 'lodash';

export class UserContestController {
    constructor(
        @repository(UserRepository) protected userRepository: UserRepository,
        @repository(ContenderRepository) protected contenderRepository: ContenderRepository,
    ) {}

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS)],
    })
    @get(API_ENDPOINTS.USERS.CONTESTS.MY, {
        responses: {
            '200': {
                description: 'Array of User has many Contest',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Contest) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<Contest>,
    ): Promise<ICommonHttpResponse<Contest[]>> {
        return { data: await this.userRepository.contests(id).find(filter) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS)],
    })
    @get(API_ENDPOINTS.USERS.CONTESTS.CONTENDER, {
        responses: {
            '200': {
                description: 'Array of User has many Contest',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Contest) },
                    },
                },
            },
        },
    })
    async contestContender(
        @param.path.number('id') id: number,
        @param.query.object('where') where?: Where<Contender>,
    ): Promise<ICommonHttpResponse<Contest[]>> {
        let defaultWhere: Where<Contender> = {
            contenderId: id,
        };
        if (where) defaultWhere = merge(defaultWhere, where);

        const defaultFilter: Filter<Contender> = {
            where: defaultWhere,
            include: [{ relation: 'contest' }],
        };

        const contenders = await this.contenderRepository.find(defaultFilter);

        const data = contenders
            .filter(contender => !isNull(contender.contest) && !isUndefined(contender.contest))
            .map(contender => contender.contest as Contest);

        return { data };
    }

    // @post('/users/{id}/contests', {
    //     responses: {
    //         '200': {
    //             description: 'User model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Contest) } },
    //         },
    //     },
    // })
    // async create(
    //     @param.path.number('id') id: typeof User.prototype.id,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contest, {
    //                     title: 'NewContestInUser',
    //                     exclude: ['id'],
    //                     optional: ['creatorId'],
    //                 }),
    //             },
    //         },
    //     })
    //     contest: Omit<Contest, 'id'>,
    // ): Promise<Contest> {
    //     return this.userRepository.contests(id).create(contest);
    // }

    // @patch('/users/{id}/contests', {
    //     responses: {
    //         '200': {
    //             description: 'User.Contest PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async patch(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contest, { partial: true }),
    //             },
    //         },
    //     })
    //     contest: Partial<Contest>,
    //     @param.query.object('where', getWhereSchemaFor(Contest)) where?: Where<Contest>,
    // ): Promise<Count> {
    //     return this.userRepository.contests(id).patch(contest, where);
    // }

    // @del('/users/{id}/contests', {
    //     responses: {
    //         '200': {
    //             description: 'User.Contest DELETE success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async delete(
    //     @param.path.number('id') id: number,
    //     @param.query.object('where', getWhereSchemaFor(Contest)) where?: Where<Contest>,
    // ): Promise<Count> {
    //     return this.userRepository.contests(id).delete(where);
    // }
}
