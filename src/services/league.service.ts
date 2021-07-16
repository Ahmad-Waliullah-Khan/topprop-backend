import {bind, /* inject, */ BindingScope} from '@loopback/core';
const { Client } = require('espn-fantasy-football-api/node');


@bind({ scope: BindingScope.SINGLETON })
export class LeagueService {

    constructor() {}

    async fetchESPNLeague(espnS2: string, swid: string): Promise<string>{

        const myClient = new Client ();
        myClient.setCookies({espnS2: espnS2, SWID: swid});
        const leagueInfo = await myClient.getLeagueInfo({seasonId: 2021 })

        return JSON.parse(leagueInfo);
    }
}
