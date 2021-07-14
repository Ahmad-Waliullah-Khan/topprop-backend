import {bind, /* inject, */ BindingScope, Getter} from '@loopback/core';
import {repository} from '@loopback/repository';
import {LeagueContestRepository, LeagueRepository} from '@src/repositories';
const { Client } = require('espn-fantasy-football-api/node');


@bind({ scope: BindingScope.SINGLETON })
export class LeagueService {
    static fetchESPNLeague(importSource: any, espnS2?: string | undefined, swid?: string | undefined) {
        throw new Error('Method not implemented.');
    }
    leagueRepo: LeagueRepository;
    leagueContestRepo: LeagueContestRepository;

    constructor(
        @repository.getter('LeagueRepository') private leagueRepoGetter: Getter<LeagueRepository>,
        @repository.getter('LeagueContestRepository') private leagueContestRepoGetter: Getter<LeagueContestRepository>,
    ) {
        (async () => {
            this.leagueRepo = await this.leagueRepoGetter();
            this.leagueContestRepo = await this.leagueContestRepoGetter();
        })();
    }

    async fetchESPNLeague(espnS2?: string, swid?: string) {

        const myClient = new Client ();
        myClient.setCookies({espnS2: espnS2, SWID: swid});
        const leagueInfo = myClient.getLeagueInfo({seasonId: 2021 })

        return leagueInfo;
    }
}
