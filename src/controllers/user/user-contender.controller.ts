import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { Count, Filter, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Contender } from '@src/models';
import { ContenderRepository } from '@src/repositories';
import { API_ENDPOINTS, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { merge } from 'lodash';

export class UserContenderController {
    constructor(
        // @repository(UserRepository) protected userRepository: UserRepository,
        @repository(ContenderRepository) protected contenderRepository: ContenderRepository, // @repository(ContestRepository) protected contestRepository: ContestRepository,
    ) {}

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTENDERS.VIEW_ALL_CONTENDERS)],
    })
    @get(API_ENDPOINTS.USERS.CONTENDER.CRUD, {
        responses: {
            '200': {
                description: 'Array of User has many Contender',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Contender) },
                    },
                },
            },
        },
    })
    async mine(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<Contender>,
    ): Promise<ICommonHttpResponse<Contender[]>> {
        let defaultFilter: Filter<Contender> = {
            where: { contenderId: id },
        };
        if (filter) defaultFilter = merge(defaultFilter, filter);

        return { data: await this.contenderRepository.find(defaultFilter) };
    }

    @authenticate('jwt')
    @authorize({
        voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTENDERS.COUNT_CONTENDERS)],
    })
    @get(API_ENDPOINTS.USERS.CONTENDER.COUNT)
    async countMine(
        @param.path.number('id') id: number,
        @param.query.object('where') where?: Where<Contender>,
    ): Promise<ICommonHttpResponse<Count>> {
        let defaultWhere: Where<Contender> = {
            contenderId: id,
        };
        if (where) defaultWhere = merge(defaultWhere, where);

        return { data: await this.contenderRepository.count(defaultWhere) };
    }
}
