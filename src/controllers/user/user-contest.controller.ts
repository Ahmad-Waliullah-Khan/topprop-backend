import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Filter, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Contender, Contest } from '@src/models';
import { ContenderRepository, ContestRepository, UserRepository } from '@src/repositories';
import { API_ENDPOINTS, CONTEST_STATUSES, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { isEqual, merge } from 'lodash';

export class UserContestController {
    constructor(
        @repository(UserRepository) protected userRepository: UserRepository,
        @repository(ContenderRepository) protected contenderRepository: ContenderRepository,
        @repository(ContestRepository) protected contestRepository: ContestRepository,
    ) {}

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS)],
    })
    @get(API_ENDPOINTS.USERS.CONTESTS.OWN, {
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
    async findMyOwn(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<Contest>,
    ): Promise<ICommonHttpResponse<Contest[]>> {
        return { data: await this.userRepository.contests(id).find(filter) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS)],
    })
    @get(API_ENDPOINTS.USERS.CONTESTS.IAM_CONTENDER, {
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
    async findIamContender(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<Contest>,
    ): Promise<ICommonHttpResponse<Contest[]>> {
        const contenders = await this.contenderRepository.find({
            where: { contenderId: id },
            fields: { id: true, contestId: true },
        });

        const contestIds = contenders.map(contender => contender.contestId);

        let defaultFilter: Filter<Contest> = {
            where: { id: { inq: contestIds } },
            include: [
                { relation: 'contenders' },
                { relation: 'game', scope: { include: [{ relation: 'homeTeam' }, { relation: 'visitorTeam' }] } },
                { relation: 'player' },
            ],
        };
        if (filter) defaultFilter = merge(defaultFilter, filter);
        const data = await this.contestRepository.find(defaultFilter);

        return { data };
    }

    //STATISTICS
    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_CONVERSION_STATISTIC)],
    })
    @get(API_ENDPOINTS.USERS.CONTESTS.STATISTICS.CONVERSION)
    async conversion(
        @param.path.number('id') id: number,
        @param.query.object('where') where?: Where<Contender>,
    ): Promise<ICommonHttpResponse<number>> {
        let conversion = 0;

        if (!(await this.userRepository.exists(id))) return { data: conversion };
        let defaultWhere: Where<Contender> = { contenderId: id };
        if (where) defaultWhere = merge(defaultWhere, where);

        const contenders = await this.contenderRepository.find({
            where: defaultWhere,
            include: [{ relation: 'contest' }],
        });

        const contendersMatched = contenders.filter(contender =>
            isEqual(contender.contest?.status, CONTEST_STATUSES.CLOSED),
        );

        if (contenders.length && contendersMatched.length)
            conversion = 100 * (contendersMatched.length / contenders.length);

        return { data: +conversion.toFixed(2) };
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
