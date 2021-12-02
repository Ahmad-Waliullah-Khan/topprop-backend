import {model, property} from '@loopback/repository';
import {Base} from '.';

@model()
export class Schedule extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'string',
        required: false,
    })
    schedule: string;
}

export interface ScheduleRelations {
    // describe navigational properties here
}

export type ScheduleWithRelations = Schedule & ScheduleRelations;
