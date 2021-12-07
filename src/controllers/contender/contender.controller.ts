import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {Count, CountSchema, Filter, FilterExcludingWhere, repository, Where} from '@loopback/repository';
import {get, getModelSchemaRef, param} from '@loopback/rest';
import {Contender} from '@src/models';
import {ContenderRepository} from '@src/repositories';
import {API_ENDPOINTS, PERMISSIONS} from '@src/utils/constants';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse} from '@src/utils/interfaces';

export class ContenderController {
    constructor(
        @repository(ContenderRepository)
        public contenderRepository: ContenderRepository,
    ) {}

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
}
