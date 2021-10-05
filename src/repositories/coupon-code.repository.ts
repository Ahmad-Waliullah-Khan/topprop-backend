import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {CouponCode, CouponCodeRelations} from '../models';

export class CouponCodeRepository extends DefaultCrudRepository<
  CouponCode,
  typeof CouponCode.prototype.id,
  CouponCodeRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(CouponCode, dataSource);
  }
}
