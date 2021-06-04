import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Timeframe, TimeframeRelations} from '../models';

export class TimeframeRepository extends DefaultCrudRepository<
  Timeframe,
  typeof Timeframe.prototype.id,
  TimeframeRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Timeframe, dataSource);
  }
}
