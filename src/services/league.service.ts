import {bind, /* inject, */ BindingScope, Getter} from '@loopback/core';
import {repository} from '@loopback/repository';
import {PlayerRepository, SpreadRepository} from '@src/repositories';
import {MiscHelpers} from '@src/utils/helpers';
import axios from 'axios';
const { Client } = require('espn-fantasy-football-api/node');

@bind({ scope: BindingScope.SINGLETON })
export class LeagueService {
    playerRepo: PlayerRepository;
    spreadRepo: SpreadRepository;

    constructor(
        @repository.getter('PlayerRepository') private playerRepoGetter: Getter<PlayerRepository>,
        @repository.getter('SpreadRepository') private spreadRepoGetter: Getter<SpreadRepository>,
    ) {
        (async () => {
            this.playerRepo = await this.playerRepoGetter();
            this.spreadRepo = await this.spreadRepoGetter();
        })();
    }

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

    async findPlayer(remotePlayer: any, localPlayers: any): Promise<any> {
        const foundLocalPlayer = localPlayers.find(
            (localPlayer: any) =>
                remotePlayer.name.first === localPlayer.firstName &&
                remotePlayer.name.last === localPlayer.lastName &&
                remotePlayer.display_position === localPlayer.position,
        );
        return foundLocalPlayer;
    }

    async calculateSpread(
        creatorProjectedPoints: number,
        opponentProjectedPoints: number,
        type: string,
        ) {
        let spread = 0;

        if (type === 'creator') {
            spread = MiscHelpers.roundValue(opponentProjectedPoints - creatorProjectedPoints, 0.5);
        } else {
            spread = MiscHelpers.roundValue(creatorProjectedPoints - opponentProjectedPoints, 0.5);
        }

        return spread;
    }

    async calculateCover(spread: number, entry: number, winBonus: boolean, spreadType: string) {
        let cover = 0;
        const spreadData = await this.spreadRepo.findOne({
            order: ['updatedAt DESC'],
            where: {
                projectionSpread: spread,
                spreadType: spreadType,
            },
        });

        if (winBonus) {
            cover = (entry * 0.85) * (spreadData ? spreadData.spreadPay : 0);
        } else {
            cover = entry * (spreadData ? spreadData.spreadPay : 0);
        }
        return cover;
    }

    async calculateWinBonus(spread: number, entry: number, spreadType: string) {
        let winBonus = 0;
        const spreadData = await this.spreadRepo.findOne({
            order: ['updatedAt DESC'],
            where: {
                projectionSpread: spread,
                spreadType: spreadType,
            },
        });
        const MLPay = spreadData ? spreadData.mlPay : 0;
        winBonus = entry * 0.15 * MLPay;
        return winBonus;
    }
}
