import { BindingScope, injectable } from '@loopback/core';
import { sportApiDateFormat } from '@src/utils/constants';
import {
    IDailyFantasyPointsData,
    IRemoteGame,
    IRemotePlayer,
    IRemoteScore,
    IRemoteTeam,
    ITimeFrame,
} from '@src/utils/interfaces';
//@ts-ignore
import fdClientModule from 'fantasydata-node-client';
import moment from 'moment';

const keys = {
    NFLv3ScoresClient: process.env.NFL_SCORES_API_KEY as string,
    NFLv3StatsClient: process.env.NFL_SCORES_API_KEY as string,
};

@injectable({ scope: BindingScope.TRANSIENT })
export class SportsDataService {
    constructor(/* Add @inject to inject parameters */) {}

    private sportDataClient = new fdClientModule(keys);

    //* SCORES
    async timeFrames(timeFrame: TIMEFRAMES): Promise<ITimeFrame[]> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getTimeframesPromise(timeFrame));
    }
    async currentWeek(): Promise<number> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getWeekCurrentPromise());
    }
    async currentSeason(): Promise<number> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getSeasonCurrentPromise());
    }
    async activeTeams(): Promise<IRemoteTeam[]> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getTeamsActivePromise());
    }

    async availablePlayers(): Promise<IRemotePlayer[]> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getPlayerDetailsByAvailablePromise());
    }

    async scheduleBySeason(season: number): Promise<IRemoteGame[]> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getSchedulePromise(season));
    }
    async scoresBySeason(season: number): Promise<IRemoteScore[]> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getScoresBySeasonPromise(season));
    }
    async scoresByWeek(season: number, week: number): Promise<IRemoteScore[]> {
        return JSON.parse(await this.sportDataClient.NFLv3ScoresClient.getScoresByWeekPromise(season, week));
    }

    //*STATS
    async fantasyPointsByDate(momentInst: moment.Moment): Promise<IDailyFantasyPointsData[]> {
        return JSON.parse(
            await this.sportDataClient.NFLv3StatsClient.getDailyFantasyScoringPromise(
                momentInst.format(sportApiDateFormat),
            ),
        );
    }
}

export enum TIMEFRAMES {
    CURRENT = 'current',
    UPCOMING = 'upcoming',
    COMPLETED = 'completed',
    RECENT = 'recent',
    ALL = 'all',
}