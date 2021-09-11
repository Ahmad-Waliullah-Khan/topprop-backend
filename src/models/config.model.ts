import { model, property } from '@loopback/repository';
import { Base } from '.';

@model()
export class Config extends Base {
    @property({
        type: 'number',
        id: true,
        generated: true,
        description: 'Table hold application config',
    })
    id: number;

    @property({
        type: 'boolean',
        required: true,
        default: true,
    })
    contestCreationEnabled: boolean;

    // Define well-known properties here

    // Indexer property to allow additional data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [prop: string]: any;

    constructor(data?: Partial<Config>) {
        super(data);
    }
}

export interface ConfigRelations {
    // describe navigational properties here
}

export type SettingsWithRelations = Config & ConfigRelations;
