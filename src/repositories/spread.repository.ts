import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Spread, SpreadRelations} from '../models';

export class SpreadRepository extends DefaultCrudRepository<
  Spread,
  typeof Spread.prototype.id,
  SpreadRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Spread, dataSource);
  }
}
