import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {ScoringType, ScoringTypeRelations} from '../models';

export class ScoringTypeRepository extends DefaultCrudRepository<
    ScoringType,
    typeof ScoringType.prototype.id,
    ScoringTypeRelations
> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(ScoringType, dataSource);
    }
}
