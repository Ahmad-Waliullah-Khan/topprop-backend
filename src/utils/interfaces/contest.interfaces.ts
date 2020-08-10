import { Contest } from '@src/models';
import { CONTEST_TYPES } from '../constants';

export interface IContestRequest extends Contest {
    type: CONTEST_TYPES;
}
