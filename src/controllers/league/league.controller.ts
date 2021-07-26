import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId} from '@loopback/security';
import {Bet, ContestRoster, League, LeagueContest} from '@src/models';
import {BetRepository, ContestRosterRepository, LeagueContestRepository, LeagueRepository, MemberRepository, PlayerRepository, RosterRepository, TeamRepository, UserRepository} from '@src/repositories';
import {UserService, WalletService} from '@src/services';
import {LeagueService} from '@src/services/league.service';
import {API_ENDPOINTS, CONTEST_STATUSES, CONTEST_TYPES, PERMISSIONS, SPREAD_TYPE} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse, ICustomUserProfile} from '@src/utils/interfaces';
import {ILeagueCreateRequest} from '@src/utils/interfaces/league.interface';
import {COMMON_MESSAGES, CONTEST_MESSAGES, LEAGUE_IMPORT_MESSAGES, LEAGUE_MESSAGES} from '@src/utils/messages';
import {LEAGUE_CONTEST_VALIDATOR} from '@src/utils/validators';
import {isEmpty} from 'lodash';
import Schema from 'validate';

export class LeagueController {
    constructor(
        @repository(LeagueRepository)
        public leagueRepository: LeagueRepository,
        @repository(LeagueContestRepository)
        public leagueContestRepository: LeagueContestRepository,
        @repository(MemberRepository)
        public memberRepository: MemberRepository,
        @repository(TeamRepository)
        public teamRepository: TeamRepository,
        @repository(PlayerRepository)
        public playerRepository: PlayerRepository,
        @repository(RosterRepository)
        public rosterRepository: RosterRepository,
        @repository(ContestRosterRepository)
        public contestRosterRepository: ContestRosterRepository,
        @repository(BetRepository)
        public betRepository: BetRepository,
        @repository(UserRepository)
        public userRepository: UserRepository,
        @service() private leagueService: LeagueService,
        @service() private walletService: WalletService,
        @service() private userService: UserService,

    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @get(API_ENDPOINTS.LEAGUE.CRUD, {
        responses: {
            '200': {
                description: 'Array of League model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(League, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async fetchLeagues(
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        const userId = +currentUser[securityId];
        const members = await this.memberRepository.find({
            where: {
                userId: userId,
            },
        });

        const leagueIdList = members.map(member => member.leagueId);

        const leagues = await this.leagueRepository.find({
            where: {
                id: { inq: leagueIdList },
            },
            order: ['createdAt DESC'],
            include: ['teams', 'members', 'scoringType'],
        });
        return {
            message: LEAGUE_IMPORT_MESSAGES.FETCH_SUCCESS,
            data: leagues,
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @post(API_ENDPOINTS.LEAGUE.CREATE_CONTEST, {
        responses: {
            '200': {
                description: 'Create a League Contest.',
            },
        },
    })
    async createLeagueContest(
        @requestBody()
        body: Partial<ILeagueCreateRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!body.creatorId) body.creatorId = +currentUser[securityId];

        const validationSchema = {
            creatorTeamId: LEAGUE_CONTEST_VALIDATOR.creatorTeamId,
            claimerTeamId: LEAGUE_CONTEST_VALIDATOR.claimerTeamId,
            entryAmount: LEAGUE_CONTEST_VALIDATOR.entryAmount,
            winBonus: LEAGUE_CONTEST_VALIDATOR.winBonus,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const creatorTeamId = body.creatorTeamId || 0;
        const claimerTeamId = body.claimerTeamId || 0;
        const creatorId = body.creatorId || 0;

        const creatorTeam = await this.teamRepository.findById(creatorTeamId, {include: ['players']});
        if (!creatorTeam) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATOR_TEAM_DOES_NOT_EXIST);

        const claimerTeam = await this.teamRepository.findById(claimerTeamId, {include: ['players']});
        if (!claimerTeam) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CLAIMER_TEAM_DOES_NOT_EXIST);

        const member = await this.memberRepository.find({
            where: {
                and: [
                    { userId: creatorId },
                    { leagueId: creatorTeamId},
                ],
            },
        });
        if (member.length <= 0) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_A_MEMBER);

        if(creatorTeam.leagueId !== claimerTeam.leagueId) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_SAME_LEAGUE);

        try {

            const creatorPlayers = creatorTeam.players;
            const claimerPlayers = claimerTeam.players;

            const remainingCreatorPlayers = creatorPlayers.filter((player) => {
                return !player?.isOver;
            });

            const remainingClaimerPlayers = claimerPlayers.filter((player) => {
                return !player?.isOver;
            });

            const creatorTeamPlayerProjFantasy = remainingCreatorPlayers.map((player) => {
                return player.projectedFantasyPoints;
            });

            const claimerTeamPlayerProjFantasy = remainingClaimerPlayers.map((player) => {
                return player.projectedFantasyPoints;
            });

            let totalCreatorTeamProjFantasy = 0;
            for(const i in creatorTeamPlayerProjFantasy) { totalCreatorTeamProjFantasy += creatorTeamPlayerProjFantasy[i]; }

            let totalClaimerTeamProjFantasy = 0;
            for(const i in claimerTeamPlayerProjFantasy) { totalClaimerTeamProjFantasy += claimerTeamPlayerProjFantasy[i]; }

            const funds = await this.walletService.userBalance(+currentUser[securityId]);
            const entryAmount = body.entryAmount || 0;
            if (funds < entryAmount * 100) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

            const winBonusFlag = body.winBonus || false;

            const creatorTeamSpread = await this.leagueService.calculateSpread(
                totalCreatorTeamProjFantasy,
                totalClaimerTeamProjFantasy,
                'creator',
            );
            const claimerTeamSpread = await this.leagueService.calculateSpread(
                totalCreatorTeamProjFantasy,
                totalClaimerTeamProjFantasy,
                'claimer',
            );

            let creatorTeamCover = 0;
            let claimerTeamCover = 0;
            let creatorTeamWinBonus = 0;
            let claimerTeamWinBonus = 0;

            let contestType = SPREAD_TYPE.LEAGUE_1_TO_2;

            if((remainingClaimerPlayers.length<=2) || (remainingCreatorPlayers.length<=2)) {
                creatorTeamCover = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_1_TO_2
                );

                claimerTeamCover = await this.leagueService.calculateCover(
                    claimerTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_1_TO_2
                );

                creatorTeamWinBonus = winBonusFlag
                ? await this.leagueService.calculateWinBonus(creatorTeamSpread, entryAmount, SPREAD_TYPE.LEAGUE_1_TO_2)
                : 0;
                claimerTeamWinBonus = winBonusFlag
                ? await this.leagueService.calculateWinBonus(claimerTeamSpread, entryAmount, SPREAD_TYPE.LEAGUE_1_TO_2)
                : 0;

                contestType = SPREAD_TYPE.LEAGUE_1_TO_2;
            }

            if((remainingClaimerPlayers.length>2) && (remainingClaimerPlayers.length<=6) || (remainingCreatorPlayers.length>2) && (remainingCreatorPlayers.length<=6)) {
                creatorTeamCover = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_3_TO_6
                );

                claimerTeamCover = await this.leagueService.calculateCover(
                    claimerTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_3_TO_6
                );

                creatorTeamWinBonus = winBonusFlag
                ? await this.leagueService.calculateWinBonus(creatorTeamSpread, entryAmount, SPREAD_TYPE.LEAGUE_3_TO_6)
                : 0;
                claimerTeamWinBonus = winBonusFlag
                ? await this.leagueService.calculateWinBonus(claimerTeamSpread, entryAmount, SPREAD_TYPE.LEAGUE_3_TO_6)
                : 0;

                contestType = SPREAD_TYPE.LEAGUE_3_TO_6;
            }

            if((remainingClaimerPlayers.length>=7) && (remainingClaimerPlayers.length<=18) || (remainingCreatorPlayers.length>=7) && (remainingCreatorPlayers.length<=18)) {
                creatorTeamCover = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_7_TO_18
                );

                claimerTeamCover = await this.leagueService.calculateCover(
                    claimerTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_7_TO_18
                );

                creatorTeamWinBonus = winBonusFlag
                ? await this.leagueService.calculateWinBonus(creatorTeamSpread, entryAmount, SPREAD_TYPE.LEAGUE_7_TO_18)
                : 0;
                claimerTeamWinBonus = winBonusFlag
                ? await this.leagueService.calculateWinBonus(claimerTeamSpread, entryAmount, SPREAD_TYPE.LEAGUE_7_TO_18)
                : 0;

                contestType = SPREAD_TYPE.LEAGUE_7_TO_18;
            }

            const creatorTeamMaxWin = Number(creatorTeamCover) + Number(creatorTeamWinBonus);
            const claimerTeamMaxWin = Number(claimerTeamCover) + Number(claimerTeamWinBonus);

            const spreadValue = entryAmount * 0.85;
            const mlValue = entryAmount - spreadValue;

            const leagueContestData = new LeagueContest();
            const userId = body.creatorId;

            leagueContestData.creatorId = userId;
            leagueContestData.creatorTeamId = creatorTeamId;
            leagueContestData.claimerTeamId = claimerTeamId;
            leagueContestData.entryAmount = entryAmount;
            leagueContestData.creatorPlayerProjFantasyPoints = totalCreatorTeamProjFantasy;
            leagueContestData.claimerPlayerProjFantasyPoints = totalClaimerTeamProjFantasy;
            leagueContestData.creatorTeamCover = creatorTeamCover;
            leagueContestData.claimerTeamCover = claimerTeamCover;
            leagueContestData.creatorTeamMaxWin = creatorTeamMaxWin;
            leagueContestData.claimerTeamMaxWin = claimerTeamMaxWin;
            leagueContestData.creatorTeamWinBonus = creatorTeamWinBonus;
            leagueContestData.claimerTeamWinBonus = claimerTeamWinBonus;
            leagueContestData.creatorTeamSpread = creatorTeamSpread;
            leagueContestData.claimerTeamSpread = claimerTeamSpread;
            leagueContestData.spreadValue = spreadValue;
            leagueContestData.mlValue = mlValue;
            leagueContestData.type = CONTEST_TYPES.LEAGUE;
            leagueContestData.status = CONTEST_STATUSES.OPEN;
            leagueContestData.ended = false;

            const createdLeagueContest = await this.leagueContestRepository.create(leagueContestData);

            creatorTeam.players.map(async (player) => {
                const contestRosterData = new ContestRoster();
                contestRosterData.teamId = creatorTeamId;
                contestRosterData.playerId = player.id;
                await this.contestRosterRepository.create(contestRosterData,);
                return false;
            });

            claimerTeam.players.map(async (player) => {
                const contestRosterData = new ContestRoster();
                contestRosterData.teamId = claimerTeamId;
                contestRosterData.playerId = player.id;
                await this.contestRosterRepository.create(contestRosterData,);
                return false;
            });

            const bet = new Bet();

            bet.contenderId = creatorTeamId;
            bet.userId = userId;
            bet.amount = entryAmount * 100;

            await this.betRepository.create(bet);

            return {
                message: LEAGUE_MESSAGES.CREATE_LEAGUE_CONTEST_SUCCESS,
                data: {
                    contest: createdLeagueContest,
                },
            };

        }
        catch (error) {
            console.log(error);
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATE_LEAGUE_CONTEST_FAILED,);
        }
    }
}
