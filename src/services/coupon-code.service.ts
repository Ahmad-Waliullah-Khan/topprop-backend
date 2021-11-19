import { bind, BindingScope, Getter, service } from '@loopback/core';
import { Filter, repository, Where } from '@loopback/repository';
import { CouponCode } from '@src/models';
import { CouponCodeRepository } from '@src/repositories';

@bind({ scope: BindingScope.SINGLETON })
export class CouponCodeService {
    constructor(
        @repository.getter('CouponCodeRepository') protected couponCodeRepositoryGetter: Getter<CouponCodeRepository>,
    ) {}

    async validCouponCode(couponCode: string): Promise<boolean> {
        const couponCodeRepository = await this.couponCodeRepositoryGetter();
        let defaultWhere: Where<CouponCode> = {
            code: { ilike: couponCode },
        };
        const couponCount = await couponCodeRepository.count(defaultWhere);
        if (couponCount.count > 0) return true;
        return false;
    }
}
