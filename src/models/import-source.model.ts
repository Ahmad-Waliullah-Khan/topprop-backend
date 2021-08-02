import {model, property} from '@loopback/repository';
import {Base} from '.';

@model()
export class ImportSource
 extends Base {
    @property({
        type: 'number',
        id: true,
        // generated: true,
    })
    id: number;

    @property({
        type: 'string',
        required: true,
    })
    name: string;

    constructor(data?: Partial<ImportSource>) {
        super(data);
    }
}

export interface ImportSourceRelations {
    // describe navigational properties here

}

export type ImportSourceWithRelations = ImportSource & ImportSourceRelations;
