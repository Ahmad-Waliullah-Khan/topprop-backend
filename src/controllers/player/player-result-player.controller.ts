import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, param } from '@loopback/rest';
import { Player, PlayerResult } from '@src/models';
import { PlayerResultRepository } from '@src/repositories';

export class PlayerResultPlayerController {
    constructor(
        @repository(PlayerResultRepository)
        public playerResultRepository: PlayerResultRepository,
    ) {}

    @get('/player-results/{id}/player', {
        responses: {
            '200': {
                description: 'Player belonging to PlayerResult',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(Player) },
                    },
                },
            },
        },
    })
    async getPlayer(@param.path.number('id') id: typeof PlayerResult.prototype.id): Promise<Player> {
        return this.playerResultRepository.player(id);
    }
}
