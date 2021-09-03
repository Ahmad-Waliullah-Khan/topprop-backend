import { Getter, inject, service } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, repository } from '@loopback/repository';
import { WALLET_MESSAGES } from '@src/utils/messages';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Contender, Gain, GainRelations, User } from '../models';
import { PaymentGatewayService, TRANSFER_TYPES } from '../services/payment-gateway.service';
import { ContenderRepository } from './contender.repository';
import { UserRepository } from './user.repository';

export class GainRepository extends DefaultCrudRepository<Gain, typeof Gain.prototype.id, GainRelations> {
    public readonly user: BelongsToAccessor<User, typeof Gain.prototype.id>;

    public readonly contender: BelongsToAccessor<Contender, typeof Gain.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        // @service() private paymentGatewayService: PaymentGatewayService,
        @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
        @repository.getter('ContenderRepository') protected contenderRepositoryGetter: Getter<ContenderRepository>,
    ) {
        super(Gain, dataSource);
        this.contender = this.createBelongsToAccessorFor('contender', contenderRepositoryGetter);
        this.registerInclusionResolver('contender', this.contender.inclusionResolver);
        this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
        this.registerInclusionResolver('user', this.user.inclusionResolver);

        //* BEFORE SAVE HOOK
        //* ASSIGN UPDATED AT
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
        /*  //* CREATE TRANSFER ON DWOLLA ( topprop root => users'  wallet)
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipGainTransfer && ctx.isNewInstance) {
                const gain = ctx.instance as Gain;
                if (gain.amount > 0) {
                    const userRepo = await this.userRepositoryGetter();
                    const user = await userRepo.findById(gain.userId);
                    if (!user._customerTokenUrl) throw new Error(WALLET_MESSAGES.INVALID_WALLET);
                    await this.paymentGatewayService.sendFunds(
                        user._customerTokenUrl,
                        TRANSFER_TYPES.GAIN,
                        gain.amount,
                    );
                }
                ctx.hookState.skipGainTransfer = true;
            }
            return;
        }); */
    }
}
