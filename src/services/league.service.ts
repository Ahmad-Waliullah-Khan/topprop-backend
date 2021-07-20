import { bind, /* inject, */ BindingScope } from '@loopback/core';
var { Client } = require('espn-fantasy-football-api/node');
import axios, { AxiosResponse } from 'axios';
import moment from 'moment';

@bind({ scope: BindingScope.SINGLETON })
export class LeagueService {
    constructor() {}

    async fetchYahooTokens(code: string | undefined): Promise<any> {
        return axios({
            method: 'post',
            url: 'https://api.login.yahoo.com/oauth2/get_token',
            data: `client_id=${process.env.YAHOO_APPLICATION_KEY}&client_secret=${process.env.YAHOO_SECRET_KEY}&redirect_uri=oob&code=${code}&grant_type=authorization_code`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    }

    async fetchESPNAccount(espnS2: string, swid: string): Promise<any> {
        return axios({
            method: 'get',
            url: `https://fan.api.espn.com/apis/v2/fans/${swid}?featureFlags=challengeEntries&featureFlags=expandAthlete&featureFlags=isolateEvents&showAirings=buy,live,replay&source=ESPN.com+-+FAM&lang=en&section=espn&region=us`,
            headers: {
                Cookie: `SWID=${swid};espn_S2=${espnS2}`,
            },
        });
    }

    async fetchESPNLeagueTeams(espnS2: string, swid: string, leagueId: number): Promise<any> {
        const myClient = new Client({ leagueId });
        myClient.setCookies({ espnS2: espnS2, SWID: swid });
        const response = await this.fetchESPNAccount(espnS2, swid);
        let seasonId;
        let scoringPeriodId;
        response.data.preferences.map((preference: any) => {
            const { id } = preference;
            const meta = id.split(':');
            const prefleagueId = meta[1];
            seasonId = meta[3];
            scoringPeriodId = meta[2];
            if (prefleagueId === leagueId) {
                return false;
            }
        });

        const teams = await myClient.getTeamsAtWeek({ seasonId, scoringPeriodId });
        return teams;
    }
}
