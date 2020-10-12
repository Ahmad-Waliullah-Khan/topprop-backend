import { Count, CountSchema, Filter, repository, Where } from '@loopback/repository';
import { del, get, getModelSchemaRef, getWhereSchemaFor, param, patch, post, requestBody } from '@loopback/rest';
import { Player, PlayerResult } from '@src/models';
import { PlayerRepository } from '@src/repositories';

export class PlayerPlayerResultController {
    constructor(@repository(PlayerRepository) protected playerRepository: PlayerRepository) {}

    @get('/players/{id}/player-results', {
        responses: {
            '200': {
                description: 'Array of Player has many PlayerResult',
                content: {
                    'application/json': {
                        schema: { type: 'array', items: getModelSchemaRef(PlayerResult) },
                    },
                },
            },
        },
    })
    async find(
        @param.path.number('id') id: number,
        @param.query.object('filter') filter?: Filter<PlayerResult>,
    ): Promise<PlayerResult[]> {
        return this.playerRepository.playerResults(id).find(filter);
    }

    @post('/players/{id}/player-results', {
        responses: {
            '200': {
                description: 'Player model instance',
                content: { 'application/json': { schema: getModelSchemaRef(PlayerResult) } },
            },
        },
    })
    async create(
        @param.path.number('id') id: typeof Player.prototype.id,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(PlayerResult, {
                        title: 'NewPlayerResultInPlayer',
                        exclude: ['id'],
                        optional: ['playerId'],
                    }),
                },
            },
        })
        playerResult: Omit<PlayerResult, 'id'>,
    ): Promise<PlayerResult> {
        return this.playerRepository.playerResults(id).create(playerResult);
    }

    @patch('/players/{id}/player-results', {
        responses: {
            '200': {
                description: 'Player.PlayerResult PATCH success count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async patch(
        @param.path.number('id') id: number,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(PlayerResult, { partial: true }),
                },
            },
        })
        playerResult: Partial<PlayerResult>,
        @param.query.object('where', getWhereSchemaFor(PlayerResult)) where?: Where<PlayerResult>,
    ): Promise<Count> {
        return this.playerRepository.playerResults(id).patch(playerResult, where);
    }

    @del('/players/{id}/player-results', {
        responses: {
            '200': {
                description: 'Player.PlayerResult DELETE success count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async delete(
        @param.path.number('id') id: number,
        @param.query.object('where', getWhereSchemaFor(PlayerResult)) where?: Where<PlayerResult>,
    ): Promise<Count> {
        return this.playerRepository.playerResults(id).delete(where);
    }
}
