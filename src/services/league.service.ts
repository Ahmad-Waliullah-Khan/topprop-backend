import { bind, /* inject, */ BindingScope } from '@loopback/core';
const { Client } = require('espn-fantasy-football-api/node');
import axios, { AxiosResponse } from 'axios';

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

    async fetchESPNLeague(espnS2: string, swid: string): Promise<string> {
        const myClient = new Client();
        myClient.setCookies({ espnS2: espnS2, SWID: swid });
        const leagueInfo = await myClient.getLeagueInfo({ seasonId: 2021 });
        return JSON.parse(leagueInfo);
    }
}
