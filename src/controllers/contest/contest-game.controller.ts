// import { repository } from '@loopback/repository';
// import { get, getModelSchemaRef, param } from '@loopback/rest';
// import { Contest, Game } from '@src/models';
// import { ContestRepository } from '@src/repositories';

// export class ContestGameController {
//     constructor(
//         @repository(ContestRepository)
//         public contestRepository: ContestRepository,
//     ) {}

//     @get('/contests/{id}/game', {
//         responses: {
//             '200': {
//                 description: 'Game belonging to Contest',
//                 content: {
//                     'application/json': {
//                         schema: { type: 'array', items: getModelSchemaRef(Game) },
//                     },
//                 },
//             },
//         },
//     })
//     async getGame(@param.path.number('id') id: typeof Contest.prototype.id): Promise<Game> {
//         return this.contestRepository.game(id);
//     }
// }
