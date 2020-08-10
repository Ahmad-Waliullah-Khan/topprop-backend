// import { repository } from '@loopback/repository';
// import { get, getModelSchemaRef, param } from '@loopback/rest';
// import { Contest, Player } from '../models';
// import { ContestRepository } from '../repositories';

// export class ContestPlayerController {
//     constructor(
//         @repository(ContestRepository)
//         public contestRepository: ContestRepository,
//     ) {}

//     @get('/contests/{id}/player', {
//         responses: {
//             '200': {
//                 description: 'Player belonging to Contest',
//                 content: {
//                     'application/json': {
//                         schema: { type: 'array', items: getModelSchemaRef(Player) },
//                     },
//                 },
//             },
//         },
//     })
//     async getPlayer(@param.path.number('id') id: typeof Contest.prototype.id): Promise<Player> {
//         return this.contestRepository.player(id);
//     }
// }
