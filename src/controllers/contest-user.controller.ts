import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import {
  Contest,
  User,
} from '../models';
import {ContestRepository} from '../repositories';

export class ContestUserController {
  constructor(
    @repository(ContestRepository) protected contestRepository: ContestRepository,
  ) { }

  // @get('/contests/{id}/user', {
  //   responses: {
  //     '200': {
  //       description: 'Contest has one User',
  //       content: {
  //         'application/json': {
  //           schema: getModelSchemaRef(User),
  //         },
  //       },
  //     },
  //   },
  // })
  // async get(
  //   @param.path.number('id') id: number,
  //   @param.query.object('filter') filter?: Filter<User>,
  // ): Promise<User> {
  //   return this.contestRepository.creator(id).get(filter);
  // }

  // @post('/contests/{id}/user', {
  //   responses: {
  //     '200': {
  //       description: 'Contest model instance',
  //       content: {'application/json': {schema: getModelSchemaRef(User)}},
  //     },
  //   },
  // })
  // async create(
  //   @param.path.number('id') id: typeof Contest.prototype.id,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(User, {
  //           title: 'NewUserInContest',
  //           exclude: ['id'],
  //           optional: ['creatorId']
  //         }),
  //       },
  //     },
  //   }) user: Omit<User, 'id'>,
  // ): Promise<User> {
  //   return this.contestRepository.creator(id).create(user);
  // }

  // @patch('/contests/{id}/user', {
  //   responses: {
  //     '200': {
  //       description: 'Contest.User PATCH success count',
  //       content: {'application/json': {schema: CountSchema}},
  //     },
  //   },
  // })
  // async patch(
  //   @param.path.number('id') id: number,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(User, {partial: true}),
  //       },
  //     },
  //   })
  //   user: Partial<User>,
  //   @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  // ): Promise<Count> {
  //   return this.contestRepository.creator(id).patch(user, where);
  // }

  // @del('/contests/{id}/user', {
  //   responses: {
  //     '200': {
  //       description: 'Contest.User DELETE success count',
  //       content: {'application/json': {schema: CountSchema}},
  //     },
  //   },
  // })
  // async delete(
  //   @param.path.number('id') id: number,
  //   @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  // ): Promise<Count> {
  //   return this.contestRepository.create(id).delete(where);
  // }
}
