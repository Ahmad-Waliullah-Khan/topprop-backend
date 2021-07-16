import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {ImportSource, ImportSourceRelations} from '../models';

export class ImportSourceRepository extends DefaultCrudRepository<
    ImportSource,
    typeof ImportSource.prototype.id,
    ImportSourceRelations
> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(ImportSource, dataSource);
    }
}
