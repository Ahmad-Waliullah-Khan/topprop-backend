import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Contender } from '@src/models';
import { ContenderRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class ContenderController {
    constructor(
        @repository(ContenderRepository)
        public contenderRepository: ContenderRepository,
    ) {}

    // @post(API_ENDPOINTS.CONTENDERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Contender model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(Contender) } },
    //         },
    //     },
    // })
    // async create(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contender, {
    //                     title: 'NewContender',
    //                     exclude: ['id'],
    //                 }),
    //             },
    //         },
    //     })
    //     contender: Omit<Contender, 'id'>,
    // ): Promise<Contender> {
    //     return this.contenderRepository.create(contender);
    // }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTENDERS.COUNT_CONTENDERS)],
    })
    @get(API_ENDPOINTS.CONTENDERS.COUNT, {
        responses: {
            '200': {
                description: 'Contender model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(Contender) where?: Where<Contender>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.contenderRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTENDERS.VIEW_ALL_CONTENDERS)],
    })
    @get(API_ENDPOINTS.CONTENDERS.CRUD, {
        responses: {
            '200': {
                description: 'Array of Contender model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(Contender, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(Contender) filter?: Filter<Contender>): Promise<ICommonHttpResponse<Contender[]>> {
        return { data: await this.contenderRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.CONTENDERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Contender PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contender, { partial: true }),
    //             },
    //         },
    //     })
    //     contender: Contender,
    //     @param.where(Contender) where?: Where<Contender>,
    // ): Promise<Count> {
    //     return this.contenderRepository.updateAll(contender, where);
    // }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTENDERS.VIEW_ANY_CONTENDER)],
    })
    @get(API_ENDPOINTS.CONTENDERS.BY_ID, {
        responses: {
            '200': {
                description: 'Contender model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Contender, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(Contender, { exclude: 'where' }) filter?: FilterExcludingWhere<Contender>,
    ): Promise<ICommonHttpResponse<Contender>> {
        return { data: await this.contenderRepository.findById(id, filter) };
    }

    // @patch(API_ENDPOINTS.CONTENDERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Contender PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Contender, { partial: true }),
    //             },
    //         },
    //     })
    //     contender: Contender,
    // ): Promise<void> {
    //     await this.contenderRepository.updateById(id, contender);
    // }

    // @put(API_ENDPOINTS.CONTENDERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Contender PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() contender: Contender): Promise<void> {
    //     await this.contenderRepository.replaceById(id, contender);
    // }

    // @del(API_ENDPOINTS.CONTENDERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Contender DELETE success',
    //         },
    //     },
    // })
    // async deleteById(@param.path.number('id') id: number): Promise<void> {
    //     await this.contenderRepository.deleteById(id);
    // }
}
