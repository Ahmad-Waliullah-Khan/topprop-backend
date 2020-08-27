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
  Contender,
} from '../models';
import {GainRepository} from '../repositories';

export class GainContenderController {
  constructor(
    @repository(GainRepository)
    public gainRepository: GainRepository,
  ) { }

  @get('/gains/{id}/contender', {
    responses: {
      '200': {
        description: 'Contender belonging to Gain',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Contender)},
          },
        },
      },
    },
  })
  async getContender(
    @param.path.number('id') id: typeof Gain.prototype.id,
  ): Promise<Contender> {
    return this.gainRepository.contender(id);
  }
}
 */
