import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Filter, repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { TopUp } from '@src/models';
import { UserRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';

export class UserTopUpController {
    constructor(@repository(UserRepository) protected userRepository: UserRepository) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.TOP_UPS.VIEW_ALL_TOP_UPS)] })
    @get(API_ENDPOINTS.USERS.TOP_UPS.CRUD, {
        responses: {
            '200': {
                description: 'Array of User has many TopUp',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(TopUp) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<TopUp>,
    ): Promise<ICommonHttpResponse<TopUp[]>> {
        return { data: await this.userRepository.topUps(id).find(filter) };
    }

    // @post('/users/{id}/top-ups', {
    //     responses: {
    //         '200': {
    //             description: 'User model instance',
    //             content: { 'application/json': { schema: getModelSchemaRef(TopUp) } },
    //         },
    //     },
    // })
    // async create(
    //     @param.path.number('id') id: typeof User.prototype.id,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(TopUp, {
    //                     title: 'NewTopUpInUser',
    //                     exclude: ['id'],
    //                     optional: ['userId'],
    //                 }),
    //             },
    //         },
    //     })
    //     topUp: Omit<TopUp, 'id'>,
    // ): Promise<TopUp> {
    //     return this.userRepository.topUps(id).create(topUp);
    // }

    // @patch('/users/{id}/top-ups', {
    //     responses: {
    //         '200': {
    //             description: 'User.TopUp PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async patch(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(TopUp, { partial: true }),
    //             },
    //         },
    //     })
    //     topUp: Partial<TopUp>,
    //     @param.query.object('where', getWhereSchemaFor(TopUp)) where?: Where<TopUp>,
    // ): Promise<Count> {
    //     return this.userRepository.topUps(id).patch(topUp, where);
    // }

    // @del('/users/{id}/top-ups', {
    //     responses: {
    //         '200': {
    //             description: 'User.TopUp DELETE success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async delete(
    //     @param.path.number('id') id: number,
    //     @param.query.object('where', getWhereSchemaFor(TopUp)) where?: Where<TopUp>,
    // ): Promise<Count> {
    //     return this.userRepository.topUps(id).delete(where);
    // }
}
