/* import { repository } from '@loopback/repository';
import { param, get, getModelSchemaRef } from '@loopback/rest';
import { Bet, Contender } from '../models';
import { BetRepository } from '../repositories';

export class BetContenderController {
    constructor(
        @repository(BetRepository)
        public betRepository: BetRepository,
    ) {}

    @get('/bets/{id}/contender', {
        responses: {
            '200': {
                description: 'Contender belonging to Bet',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Contender) },
                    },
                },
            },
        },
    })
    async getContender(@param.path.number('id') id: typeof Bet.prototype.id): Promise<Contender> {
        return this.betRepository.contender(id);
    }
}
 */
