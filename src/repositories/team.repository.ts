import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { NFL_TEAMS } from '@src/utils/constants';
import chalk from 'chalk';
import { startCase, values } from 'lodash';
import moment from 'moment';
import { DbDataSource } from '../datasources';
import { Team, TeamRelations } from '../models';

export class TeamRepository extends DefaultCrudRepository<Team, typeof Team.prototype.id, TeamRelations> {
    constructor(@inject('datasources.db') dataSource: DbDataSource) {
        super(Team, dataSource);
        this._init();

        //*BEFORE SAVE
        this.modelClass.observe('before save', async ctx => {
            if (ctx.instance && !ctx.hookState.skipSetUpdateAt) {
                ctx.instance.updatedAt = moment().toDate();
                ctx.hookState.skipSetUpdateAt = true;
            }
            return;
        });
    }

    async _init() {
        for (let index = 0; index < values(NFL_TEAMS).length; index++) {
            const teamSlug = values(NFL_TEAMS)[index];
            const team = await this.findOne({ where: { slug: teamSlug } });
            if (!team) {
                await this.create({ league: 'nfl', slug: teamSlug, name: startCase(teamSlug) });
                console.log(chalk.greenBright(`Team: ${teamSlug} created.`));
            } else console.log(chalk.greenBright(`Team: ${teamSlug} already exists.`));
        }
    }
}
