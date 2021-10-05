import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BonusPayout, BonusPayoutRelations} from '../models';

export class BonusPayoutRepository extends DefaultCrudRepository<
  BonusPayout,
  typeof BonusPayout.prototype.id,
  BonusPayoutRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(BonusPayout, dataSource);
  }
}
