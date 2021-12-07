import {repository} from '@loopback/repository';
import {ContestRepository, UserRepository} from '@src/repositories';

export class ContestUserController {
    constructor(
        @repository(ContestRepository)
        public contestRepository: ContestRepository,
        public userRepository: UserRepository,
    ) {}
}
