import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { TopUp } from '@src/models';
import { TopUpRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class TopUpController {
    constructor(
        @repository(TopUpRepository)
        public topUpRepository: TopUpRepository,
    ) {}

    // @post(API_ENDPOINTS.TOP_UPS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'TopUp model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(TopUp) } },
    //         },
    //     },
    // })
    // async create(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(TopUp, {
    //                     title: 'NewTopUp',
    //                     exclude: ['id'],
    //                 }),
    //             },
    //         },
    //     })
    //     topUp: Omit<TopUp, 'id'>,
    // ): Promise<TopUp> {
    //     return this.topUpRepository.create(topUp);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TOP_UPS.COUNT_TOP_UPS)] })
    @get(API_ENDPOINTS.TOP_UPS.COUNT, {
        responses: {
            '200': {
                description: 'TopUp model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(TopUp) where?: Where<TopUp>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.topUpRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TOP_UPS.VIEW_ALL_TOP_UPS)] })
    @get(API_ENDPOINTS.TOP_UPS.CRUD, {
        responses: {
            '200': {
                description: 'Array of TopUp model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(TopUp, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(TopUp) filter?: Filter<TopUp>): Promise<ICommonHttpResponse<TopUp[]>> {
        return { data: await this.topUpRepository.find(filter) };
    }

    // @patch(API_ENDPOINTS.TOP_UPS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'TopUp PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(TopUp, { partial: true }),
    //             },
    //         },
    //     })
    //     topUp: TopUp,
    //     @param.where(TopUp) where?: Where<TopUp>,
    // ): Promise<Count> {
    //     return this.topUpRepository.updateAll(topUp, where);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TOP_UPS.VIEW_ANY_TOP_UP)] })
    @get(API_ENDPOINTS.TOP_UPS.BY_ID, {
        responses: {
            '200': {
                description: 'TopUp model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(TopUp, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(TopUp, { exclude: 'where' }) filter?: FilterExcludingWhere<TopUp>,
    ): Promise<ICommonHttpResponse<TopUp>> {
        return { data: await this.topUpRepository.findById(id, filter) };
    }

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TOP_UPS.VIEW_ALL_TOP_UPS)] })
    // @patch(API_ENDPOINTS.TOP_UPS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'TopUp PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(TopUp, { partial: true }),
    //             },
    //         },
    //     })
    //     topUp: TopUp,
    // ): Promise<void> {
    //     await this.topUpRepository.updateById(id, topUp);
    // }

    // @put(API_ENDPOINTS.TOP_UPS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'TopUp PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() topUp: TopUp): Promise<void> {
    //     await this.topUpRepository.replaceById(id, topUp);
    // }

    // @del(API_ENDPOINTS.TOP_UPS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'TopUp DELETE success',
    //         },
    //     },
    // })
    // async deleteById(@param.path.number('id') id: number): Promise<void> {
    //     await this.topUpRepository.deleteById(id);
    // }
}
