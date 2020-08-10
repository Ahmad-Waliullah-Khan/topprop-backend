// import { repository } from '@loopback/repository';
// import { get, getModelSchemaRef, param } from '@loopback/rest';
// import { Contender, Contest } from '../models';
// import { ContenderRepository } from '../repositories';

// export class ContenderContestController {
//     constructor(
//         @repository(ContenderRepository)
//         public contenderRepository: ContenderRepository,
//     ) {}

//     @get('/contenders/{id}/contest', {
//         responses: {
//             '200': {
//                 description: 'Contest belonging to Contender',
//                 content: {
//                     'application/json': {
//                         schema: { type: 'array', items: getModelSchemaRef(Contest) },
//                     },
//                 },
//             },
//         },
//     })
//     async getContest(@param.path.number('id') id: typeof Contender.prototype.id): Promise<Contest> {
//         return this.contenderRepository.contest(id);
//     }
// }
