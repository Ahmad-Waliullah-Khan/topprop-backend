import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId} from '@loopback/security';
import {Bet, ContestRoster, League, LeagueContest} from '@src/models';
import {BetRepository, ContestRosterRepository, LeagueContestRepository, LeagueRepository, MemberRepository, PlayerRepository, RosterRepository, TeamRepository, UserRepository} from '@src/repositories';
import {UserService, WalletService} from '@src/services';
import {LeagueService} from '@src/services/league.service';
import {API_ENDPOINTS, CONTEST_STATUSES, CONTEST_TYPES, PERMISSIONS, SPREAD_TYPE} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse, ICustomUserProfile} from '@src/utils/interfaces';
import {ILeagueClaimContestRequest, ILeagueCreateRequest} from '@src/utils/interfaces/league.interface';
import {COMMON_MESSAGES, CONTEST_MESSAGES, LEAGUE_IMPORT_MESSAGES, LEAGUE_MESSAGES} from '@src/utils/messages';
import {LEAGUE_CONTEST_CLAIM_VALIDATOR, LEAGUE_CONTEST_VALIDATOR} from '@src/utils/validators';
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
    @post(API_ENDPOINTS.LEAGUE.CONTEST.CRUD, {
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
                    { userId: body.creatorId },
                    { leagueId: creatorTeam.leagueId},
                ],
            },
        });

        if (member.length <= 0) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_A_MEMBER);

        if(creatorTeam.leagueId !== claimerTeam.leagueId) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_SAME_LEAGUE);

        try {

            const creatorTeamRoster = await this.rosterRepository.find({
                where: {
                    teamId: creatorTeamId
                },
                include: ['player', 'team'],
            });

            const claimerTeamRoster = await this.rosterRepository.find({
                where: {
                    teamId: claimerTeamId
                },
                include: ['player', 'team'],
            });

            const remainingCreatorPlayers = creatorTeamRoster.filter((roster) => {
                return !roster.player?.isOver;
            });

            const remainingClaimerPlayers = claimerTeamRoster.filter((roster) => {
                return !roster.player?.isOver;
            });

            const creatorTeamPlayerProjFantasy = remainingCreatorPlayers.map((roster) => {
                return roster.player? roster.player.projectedFantasyPoints: 0;
            });

            const claimerTeamPlayerProjFantasy = remainingClaimerPlayers.map((roster) => {
                return roster.player? roster.player.projectedFantasyPoints: 0;
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
                    // myContests: myContests
                },
            };

        }
        catch (error) {
            console.log(error);
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATE_LEAGUE_CONTEST_FAILED,);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ALL_CONTESTS)] })
    @get(API_ENDPOINTS.LEAGUE.CONTEST.CRUD, {
        responses: {
            '200': {
                description: 'Array of League Contest model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(LeagueContest, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(LeagueContest) filter?: Filter<LeagueContest>): Promise<ICommonHttpResponse<LeagueContest[]>> {
        return { data: await this.leagueContestRepository.find(filter) };
    }


    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @patch(API_ENDPOINTS.LEAGUE.CONTEST.CRUD, {
        responses: {
            '200': {
                description: 'League Contest model instance',
                content: {
                    'application/json': {
                        schema: {
                            message: { type: 'string' },
                            data: {
                                myContests: { type: 'array', items: getModelSchemaRef(LeagueContest) },
                                contests: { type: 'array', items: getModelSchemaRef(LeagueContest) },
                            },
                        },
                    },
                },
            },
        },
    })
    async claim(
        @requestBody()
        body: Partial<ILeagueClaimContestRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!body.claimerId) body.claimerId = +currentUser[securityId];

        const validationSchema = {
            leagueContestId: LEAGUE_CONTEST_CLAIM_VALIDATOR.leagueContestId,
            claimerId: LEAGUE_CONTEST_CLAIM_VALIDATOR.claimerId,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const leagueContestId = body.leagueContestId || 0;
        const userId = body.claimerId || 0;
        const leagueContestData = await this.leagueContestRepository.findById(leagueContestId);
        if (!leagueContestData) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.CONTEST_NOT_FOUND);

        if (leagueContestData.claimerId) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.CONTEST_ALREADY_MATCHED);

        const funds = await this.walletService.userBalance(userId);
        const entryAmount = leagueContestData.entryAmount || 0;
        if (funds < entryAmount * 100) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

        leagueContestData.claimerId = body.claimerId;
        leagueContestData.status = CONTEST_STATUSES.MATCHED;

        const updatedContest = await this.leagueContestRepository.updateById(leagueContestId, leagueContestData);

        const bet = new Bet();

        bet.contenderId = leagueContestData.claimerTeamId;
        bet.userId = userId;
        bet.amount = leagueContestData.entryAmount * 100;

        await this.betRepository.create(bet);

        const myContestFilter = {
            where: {
                and: [
                    { ended: false },
                    { or: [{ creatorId: userId }, { claimerId: userId }] },
                    {
                        or: [
                            { status: CONTEST_STATUSES.OPEN },
                            { status: CONTEST_STATUSES.MATCHED },
                            { status: CONTEST_STATUSES.UNMATCHED },
                        ],
                    },
                ],
            },
            include: ['creator', 'claimer', 'winner', 'creatorTeam', 'claimerTeam'],
        };

        const contestFilter = {
            where: {
                status: CONTEST_STATUSES.OPEN,
                ended: false,
                creatorId: { neq: userId },
            },
            include: ['creator', 'claimer', 'winner', 'creatorTeam', 'claimerTeam'],
        };
        const myContests = await this.leagueContestRepository.find(myContestFilter);
        const contests = await this.leagueContestRepository.find(contestFilter);

        return {
            message: CONTEST_MESSAGES.CLAIM_SUCCESS,
            data: {
                myContests: myContests,
                contests: contests,
            },
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.VIEW_ANY_CONTEST)] })
    @get(API_ENDPOINTS.LEAGUE.CONTEST.TEAM_ROSTER, {
        responses: {
            '200': {
                description: 'Contest Roster model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(ContestRoster, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
    ): Promise<ICommonHttpResponse<any>> {

        try{

            const leagueContest = await this.leagueContestRepository.findById(
                id,
                {include: ['creatorTeam', 'claimerTeam']}
            );

            const creatorTeam = leagueContest.creatorTeam;
            const claimerTeam = leagueContest.claimerTeam;

            const creatorTeamRoster = await this.contestRosterRepository.find({
                where: {teamId: creatorTeam? creatorTeam.id : 0
                    },
                    include: ['player', 'team']
            })

            const claimerTeamRoster = await this.contestRosterRepository.find({
                where: {teamId: claimerTeam? claimerTeam.id : 0
                    },
                    include: ['player', 'team']
            })

            const data = {
                "creatorTeamRoster": creatorTeamRoster,
                "claimerTeamRoster": claimerTeamRoster
            }

            return { data: data  };

        }catch(error) {
            console.log(error);
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.LEAGUE_CONTEST_ROSTER_FAILED,);
        }

    }
}


