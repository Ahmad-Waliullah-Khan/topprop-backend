// import { repository } from '@loopback/repository';
// import { param, get, getModelSchemaRef } from '@loopback/rest';
// import { Contender, User } from '../models';
// import { ContenderRepository } from '../repositories';

// export class ContenderUserController {
//     constructor(
//         @repository(ContenderRepository)
//         public contenderRepository: ContenderRepository,
//     ) {}

//     @get('/contenders/{id}/user', {
//         responses: {
//             '200': {
//                 description: 'User belonging to Contender',
//                 content: {
//                     'application/json': {
//                         schema: { type: 'array', items: getModelSchemaRef(User) },
//                     },
//                 },
//             },
//         },
//     })
//     async getUser(@param.path.number('id') id: typeof Contender.prototype.id): Promise<User> {
//         return this.contenderRepository.contender(id);
//     }
// }
