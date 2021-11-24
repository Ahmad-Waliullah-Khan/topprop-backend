import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import moment from 'moment';
import {DbDataSource} from '../datasources';
import {CronLog, CronLogRelations, Player} from '../models';
import {PlayerRepository} from './player.repository';


export class CronLogRepository extends DefaultCrudRepository<
CronLog,
typeof CronLog.prototype.id,
CronLogRelations
> {
    public readonly player: BelongsToAccessor<Player, typeof CronLog.prototype.id>;

    constructor(
        @inject('datasources.db') dataSource: DbDataSource,
        @repository.getter('PlayerRepository') protected playerRepositoryGetter: Getter<PlayerRepository>,
    ) {
        super(CronLog, dataSource);

        this.player = this.createBelongsToAccessorFor('player', playerRepositoryGetter);
        this.registerInclusionResolver('player', this.player.inclusionResolver);

        //* BEFORE SAVE HOOK
        //* ASSIGN UPDATED AT
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
    }
}
