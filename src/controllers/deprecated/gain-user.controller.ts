/* import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  Gain,
  User,
} from '../models';
import {GainRepository} from '../repositories';

export class GainUserController {
  constructor(
    @repository(GainRepository)
    public gainRepository: GainRepository,
  ) { }

  @get('/gains/{id}/user', {
    responses: {
      '200': {
        description: 'User belonging to Gain',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(User)},
          },
        },
      },
    },
  })
  async getUser(
    @param.path.number('id') id: typeof Gain.prototype.id,
  ): Promise<User> {
    return this.gainRepository.user(id);
  }
}
 */
