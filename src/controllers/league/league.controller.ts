import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {Filter, FilterExcludingWhere, IsolationLevel, repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId} from '@loopback/security';
import {Bet, ContestRoster, Invite, League, LeagueContest, Member, Roster, Team} from '@src/models';
import {
    BetRepository, ContestRosterRepository, InviteRepository, LeagueContestRepository, LeagueRepository,
    MemberRepository, PlayerRepository,
    RosterRepository, TeamRepository, UserRepository
} from '@src/repositories';
import {LeagueService} from '@src/services/league.service';
import {UserService} from '@src/services/user.service';
import {WalletService} from '@src/services/wallet.service';
import {API_ENDPOINTS, CONTEST_STATUSES, CONTEST_TYPES, EMAIL_TEMPLATES, PERMISSIONS, SPREAD_TYPE} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {
    ICommonHttpResponse, ICustomUserProfile, ILeagueClaimContestRequest, ILeagueCreateRequest, ILeagueInvitesFetchRequest,
    ILeagueInvitesJoinRequest, ILeagueInvitesRequest, ILeagueResync
} from '@src/utils/interfaces';
import {COMMON_MESSAGES, CONTEST_MESSAGES, LEAGUE_MESSAGES} from '@src/utils/messages';
import {IMPORT_LEAGUE_VALIDATOR, INVITE_VALIDATOR, LEAGUE_CONTEST_CLAIM_VALIDATOR, LEAGUE_CONTEST_VALIDATOR} from '@src/utils/validators';
import {find, isEmpty} from 'lodash';
import moment from 'moment';
import {v4 as uuidv4} from 'uuid';
import Schema from 'validate';
const YahooFantasy = require('yahoo-fantasy');


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
        @repository(InviteRepository)
        public inviteRepository: InviteRepository,
        @repository(UserRepository)
        public userRepository: UserRepository,
        @repository(PlayerRepository)
        public playerRepository: PlayerRepository,
        @repository(RosterRepository)
        public rosterRepository: RosterRepository,
        @repository(ContestRosterRepository)
        public contestRosterRepository: ContestRosterRepository,
        @repository(BetRepository)
        public betRepository: BetRepository,
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
            include: [
                {
                    relation: 'teams',
                    scope: {
                        include: ['user'],
                    },
                },
                {
                    relation: 'members',
                    scope: {
                        include: ['user'],
                    },
                },
                {
                    relation: 'scoringType',
                },
            ],
        });
        return {
            message: LEAGUE_MESSAGES.FETCH_LEAGUES_SUCCESS,
            data: leagues,
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @get(API_ENDPOINTS.LEAGUE.BY_ID, {
        responses: {
            '200': {
                description: 'League model instances',
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
    async fetchLeagueById(
        @param.path.number('id') id: number,
        @param.filter(League, { exclude: 'where' }) filter?: FilterExcludingWhere<League>,
    ): Promise<ICommonHttpResponse<any>> {
        const leagues = await this.leagueRepository.findById(id, {
            include: [
                {
                    relation: 'teams',
                    scope: {
                        include: [
                            {
                                relation: 'user',
                            },
                            {
                                relation: 'rosters',
                                scope: {
                                    include: [{ relation: 'player' }],
                                },
                            },
                        ],
                    },
                },
                {
                    relation: 'members',
                    scope: {
                        include: ['user'],
                    },
                },
                {
                    relation: 'scoringType',
                },
            ],
        });
        return {
            message: LEAGUE_MESSAGES.FETCH_LEAGUE_SUCCESS,
            data: leagues,
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @post(API_ENDPOINTS.LEAGUE.INVITE, {
        responses: {
            '200': {
                description: 'League invitations',
            },
        },
    })
    async sendLeagueInvites(
        @param.path.number('id') id: number,
        @requestBody()
        body: Partial<ILeagueInvitesRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const loggedInUser = +currentUser[securityId];
        const user = await this.userRepository.findById(loggedInUser);

        const invitees = body.invitees || [];

        const league = await this.leagueRepository.findById(id, {
            include: [
                {
                    relation: 'teams',
                },
                {
                    relation: 'members',
                    scope: {
                        include: ['user'],
                    },
                },
                {
                    relation: 'scoringType',
                },
            ],
        });

        try {
            await Promise.all(
                invitees.map(async invitee => {
                    const foundMember = find(league.members, (member: any) => {
                        return invitee.email === member.user.email;
                    });

                    if (foundMember) {
                        if (invitee.teamId) {
                            await this.teamRepository.updateById(invitee.teamId, {
                                userId: foundMember.userId,
                                updatedAt: moment().toDate().toString(),
                            });
                        }
                    } else {
                        const foundMember = await this.memberRepository.findOne({
                            where: {
                                userId: user.id,
                            },
                        });

                        const token = uuidv4();
                        const InviteData = new Invite();
                        InviteData.email = invitee.email;
                        InviteData.token = token;
                        InviteData.leagueId = id;

                        InviteData.tokenExpired = false;
                        if (invitee.teamId) {
                            InviteData.teamId = invitee.teamId;
                        }

                        if (foundMember) {
                            InviteData.memberId = foundMember.id;
                        }

                        const invite = await this.inviteRepository.create(InviteData);

                        const clientHost = process.env.CLIENT_HOST;

                        this.userService.sendEmail(
                            user,
                            EMAIL_TEMPLATES.LEAGUE_INVITE,
                            {
                                user: {
                                    fullName: '',
                                },
                                text: {
                                    title: `You have been invited to ${league.name}`,
                                    subtitle: `This league invite was sent to you by ${user.fullName}.Please click on the button below to accept the join the league`,
                                },
                                link: {
                                    url: `${clientHost}/league/invitation/${invite.token}`,
                                    text: 'Join League',
                                },
                            },
                            invite.email,
                        );
                    }
                }),
            );

            const updatedLeague = await this.leagueRepository.findById(id, {
                include: [
                    {
                        relation: 'teams',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'members',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'scoringType',
                    },
                ],
            });

            return {
                message: LEAGUE_MESSAGES.INVITATION_SENDING_SUCCESS,
                data: updatedLeague,
            };
        } catch (error) {
            console.log('🚀 ~ file: league.controller.ts ~ line 206 ~ LeagueController ~ error', error);
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.INVITATION_SENDING_FAILED);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @post(API_ENDPOINTS.LEAGUE.FETCH_INVITE, {
        responses: {
            '200': {
                description: 'Fetch League invitation',
            },
        },
    })
    async fetchLeagueInvite(
        @requestBody()
        body: Partial<ILeagueInvitesFetchRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            token: INVITE_VALIDATOR.token,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        try {
            const invite = await this.inviteRepository.findOne({
                where: {
                    token: body.token,
                },
                include: [
                    {
                        relation: 'league',
                        scope: {
                            include: ['user', 'teams', 'members', 'scoringType'],
                        },
                    },
                    {
                        relation: 'team',
                    },
                    {
                        relation: 'member',
                        scope: {
                            include: ['user'],
                        },
                    },
                ],
            });

            return {
                message: LEAGUE_MESSAGES.INVITATION_FETCHING_SUCCESS,
                data: invite,
            };
        } catch (error) {
            console.log('🚀 ~ file: league.controller.ts ~ line 206 ~ LeagueController ~ error', error);
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.INVITATION_FETCHING_FAILED);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @post(API_ENDPOINTS.LEAGUE.JOIN, {
        responses: {
            '200': {
                description: 'Join League invitation',
            },
        },
    })
    async joinLeagueInvite(
        @requestBody()
        body: Partial<ILeagueInvitesJoinRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);
        const userId = +currentUser[securityId];
        const validationSchema = {
            inviteId: INVITE_VALIDATOR.inviteId,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const invite = await this.inviteRepository.findOne({
            where: {
                id: body.inviteId,
            },
            include: [
                {
                    relation: 'team',
                },
                {
                    relation: 'member',
                    scope: {
                        include: ['user'],
                    },
                },
            ],
        });

        if (invite?.tokenExpired) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.INVITATION_EXPIRED);

        const user = await this.userRepository.findById(userId);

        if (user.email !== invite?.email)
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.INCORRECT_USER_FOR_INVITATION);

        const member = await this.memberRepository.findOne({
            where: {
                leagueId: invite.leagueId,
                userId: user.id,
            },
        });

        if (member) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.EXISTING_MEMBER);

        try {
            const memberData = new Member();
            memberData.leagueId = invite.leagueId;
            memberData.userId = user.id;

            await this.memberRepository.create(memberData);

            if (invite.teamId) {
                await this.teamRepository.updateById(invite.teamId, {
                    userId: user.id,
                    updatedAt: moment().toDate().toString(),
                });
            }

            await this.inviteRepository.updateById(invite.id, {
                tokenExpired: true,
                updatedAt: moment().toDate().toString(),
            });

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

            const updatedLeague = await this.leagueRepository.findById(invite.leagueId, {
                include: [
                    {
                        relation: 'teams',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'members',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'scoringType',
                    },
                ],
            });

            return {
                message: LEAGUE_MESSAGES.INVITATION_JOINING_SUCCESS,
                data: {
                    currentLeague: updatedLeague,
                    leagues: leagues,
                },
            };
        } catch (error) {
            console.log('🚀 ~ file: league.controller.ts ~ line 206 ~ LeagueController ~ error', error);
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.INVITATION_JOINING_FAILED);
        }
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

        const userId = +currentUser[securityId];

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

        const creatorTeam = await this.teamRepository.findById(creatorTeamId, { include: ['rosters'] });
        if (!creatorTeam) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATOR_TEAM_DOES_NOT_EXIST);

        const claimerTeam = await this.teamRepository.findById(claimerTeamId, { include: ['rosters'] });
        if (!claimerTeam) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CLAIMER_TEAM_DOES_NOT_EXIST);

        const member = await this.memberRepository.find({
            where: {
                and: [{ userId: body.creatorId }, { leagueId: creatorTeam.leagueId }],
            },
        });

        if (member.length <= 0) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_A_MEMBER);

        if (creatorTeam.leagueId !== claimerTeam.leagueId)
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_SAME_LEAGUE);

        try {
            const creatorTeamRoster = await this.rosterRepository.find({
                where: {
                    teamId: creatorTeamId,
                },
                include: ['player', 'team'],
            });

            if (creatorTeamRoster.length === 0) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.EMPTY_ROSTER_CREATOR);

            const claimerTeamRoster = await this.rosterRepository.find({
                where: {
                    teamId: claimerTeamId,
                },
                include: ['player', 'team'],
            });
            if (claimerTeamRoster.length === 0) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.EMPTY_ROSTER_CLAIMER);

            const remainingCreatorPlayers = creatorTeamRoster.filter(roster => {
                return !roster.player?.isOver;
            });

            const completedCreatorPlayers = creatorTeamRoster.filter(roster => {
                return roster.player?.isOver;
            });

            const remainingClaimerPlayers = claimerTeamRoster.filter(roster => {
                return !roster.player?.isOver;
            });

            const completedClaimerPlayers = claimerTeamRoster.filter(roster => {
                return roster.player?.isOver;
            });

            const creatorTeamPlayerProjFantasy = remainingCreatorPlayers.map(roster => {
                return roster.player ? roster.player.projectedFantasyPoints : 0;
            });

            const creatorTeamPlayerFantasy = remainingCreatorPlayers.map(roster => {
                return roster.player ? roster.player.fantasyPoints : 0;
            });

            const claimerTeamPlayerProjFantasy = remainingClaimerPlayers.map(roster => {
                return roster.player ? roster.player.projectedFantasyPoints : 0;
            });

            const claimerTeamPlayerFantasy = remainingClaimerPlayers.map(roster => {
                return roster.player ? roster.player.fantasyPoints : 0;
            });

            let totalCreatorTeamProjFantasy =
                creatorTeamPlayerProjFantasy.length > 0
                    ? creatorTeamPlayerProjFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0;

            totalCreatorTeamProjFantasy =
                totalCreatorTeamProjFantasy + creatorTeamPlayerFantasy.length > 0
                    ? creatorTeamPlayerFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0;

            let totalClaimerTeamProjFantasy =
                creatorTeamPlayerProjFantasy.length > 0
                    ? claimerTeamPlayerProjFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0;

            totalClaimerTeamProjFantasy =
                totalClaimerTeamProjFantasy + claimerTeamPlayerFantasy.length > 0
                    ? claimerTeamPlayerFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0;

            // TODO remove the following lines
            totalCreatorTeamProjFantasy = 200;
            totalClaimerTeamProjFantasy = 207;

            const funds = await this.walletService.userBalance(+currentUser[securityId]);
            const entryAmount = body.entryAmount || 0;
            if (funds < entryAmount * 100) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

            const winBonusFlag = body.winBonus || true;

            let creatorTeamSpread = 0;
            let claimerTeamSpread = 0;
            let creatorTeamCover = 0;
            let claimerTeamCover = 0;
            let creatorTeamWinBonus = 0;
            let claimerTeamWinBonus = 0;

            let contestType = SPREAD_TYPE.LEAGUE_1_TO_2;

            const projSpreadDiff = Number(totalCreatorTeamProjFantasy) - Number(totalClaimerTeamProjFantasy);

            const spreadDiff = Math.abs(projSpreadDiff);

            if (spreadDiff > 20) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.POINT_SPREAD_TOO_LARGE);

            if (remainingClaimerPlayers.length <= 2 || remainingCreatorPlayers.length <= 2) {
                creatorTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'creator',
                    SPREAD_TYPE.LEAGUE_1_TO_2,
                );

                claimerTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'claimer',
                    SPREAD_TYPE.LEAGUE_1_TO_2,
                );

                creatorTeamCover = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_1_TO_2,
                );

                claimerTeamCover = await this.leagueService.calculateCover(
                    claimerTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_1_TO_2,
                );

                creatorTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          creatorTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_1_TO_2,
                      )
                    : 0;
                claimerTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          claimerTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_1_TO_2,
                      )
                    : 0;

                contestType = SPREAD_TYPE.LEAGUE_1_TO_2;
            }

            if (
                (remainingClaimerPlayers.length > 2 && remainingClaimerPlayers.length <= 6) ||
                (remainingCreatorPlayers.length > 2 && remainingCreatorPlayers.length <= 6)
            ) {
                creatorTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'creator',
                    SPREAD_TYPE.LEAGUE_3_TO_6,
                );

                claimerTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'claimer',
                    SPREAD_TYPE.LEAGUE_3_TO_6,
                );

                creatorTeamCover = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_3_TO_6,
                );

                claimerTeamCover = await this.leagueService.calculateCover(
                    claimerTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_3_TO_6,
                );

                creatorTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          creatorTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_3_TO_6,
                      )
                    : 0;
                claimerTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          claimerTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_3_TO_6,
                      )
                    : 0;

                contestType = SPREAD_TYPE.LEAGUE_3_TO_6;
            }

            if (
                (remainingClaimerPlayers.length >= 7 && remainingClaimerPlayers.length <= 18) ||
                (remainingCreatorPlayers.length >= 7 && remainingCreatorPlayers.length <= 18)
            ) {
                creatorTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'creator',
                    SPREAD_TYPE.LEAGUE_7_TO_18,
                );

                claimerTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'claimer',
                    SPREAD_TYPE.LEAGUE_7_TO_18,
                );

                creatorTeamCover = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_7_TO_18,
                );

                claimerTeamCover = await this.leagueService.calculateCover(
                    claimerTeamSpread,
                    entryAmount,
                    winBonusFlag,
                    SPREAD_TYPE.LEAGUE_7_TO_18,
                );

                creatorTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          creatorTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_7_TO_18,
                      )
                    : 0;

                claimerTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          claimerTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_7_TO_18,
                      )
                    : 0;

                contestType = SPREAD_TYPE.LEAGUE_7_TO_18;
            }

            const creatorTeamMaxWin = Number(creatorTeamCover) + Number(creatorTeamWinBonus);
            const claimerTeamMaxWin = Number(claimerTeamCover) + Number(claimerTeamWinBonus);

            const spreadValue = entryAmount * 0.85;
            const mlValue = entryAmount - spreadValue;

            const leagueContestData = new LeagueContest();
            // const userId = body.creatorId;

            leagueContestData.creatorId = userId;
            leagueContestData.creatorTeamId = creatorTeamId;
            leagueContestData.claimerTeamId = claimerTeamId;
            leagueContestData.entryAmount = entryAmount;
            leagueContestData.creatorTeamProjFantasyPoints = totalCreatorTeamProjFantasy;
            leagueContestData.claimerTeamProjFantasyPoints = totalClaimerTeamProjFantasy;
            leagueContestData.creatorTeamCover = creatorTeamCover;
            leagueContestData.claimerTeamCover = claimerTeamCover;
            leagueContestData.creatorTeamMaxWin = creatorTeamMaxWin;
            leagueContestData.claimerTeamMaxWin = claimerTeamMaxWin;
            leagueContestData.creatorTeamWinBonus = creatorTeamWinBonus;
            leagueContestData.claimerTeamWinBonus = claimerTeamWinBonus;
            leagueContestData.creatorTeamSpread = creatorTeamSpread;
            leagueContestData.claimerTeamSpread = claimerTeamSpread;
            leagueContestData.leagueId = creatorTeam.leagueId;
            leagueContestData.spreadValue = spreadValue;
            leagueContestData.mlValue = mlValue;
            leagueContestData.type = CONTEST_TYPES.LEAGUE;
            leagueContestData.status = CONTEST_STATUSES.OPEN;
            leagueContestData.ended = false;

            const createdLeagueContest = await this.leagueContestRepository.create(leagueContestData);
            creatorTeam?.rosters?.map(async player => {
                const contestRosterData = new ContestRoster();
                contestRosterData.teamId = creatorTeamId;
                contestRosterData.playerId = player.id;
                await this.contestRosterRepository.create(contestRosterData);
                return false;
            });

            claimerTeam?.rosters?.map(async player => {
                const contestRosterData = new ContestRoster();
                contestRosterData.teamId = claimerTeamId;
                contestRosterData.playerId = player.id;
                await this.contestRosterRepository.create(contestRosterData);
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
        } catch (error) {
            console.log('🚀 ~ file: league.controller.ts ~ line 850 ~ LeagueController ~ error', error);
            if (error.name === 'BadRequestError') {
                throw new HttpErrors.BadRequest(error.message);
            }
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATE_LEAGUE_CONTEST_FAILED);
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
    async find(
        @param.filter(LeagueContest) filter?: Filter<LeagueContest>,
    ): Promise<ICommonHttpResponse<LeagueContest[]>> {
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
    async findById(@param.path.number('id') id: number): Promise<ICommonHttpResponse<any>> {
        try {
            const leagueContest = await this.leagueContestRepository.findById(id, {
                include: ['creatorTeam', 'claimerTeam'],
            });

            const creatorTeam = leagueContest.creatorTeam;
            const claimerTeam = leagueContest.claimerTeam;

            const creatorTeamRoster = await this.contestRosterRepository.find({
                where: { teamId: creatorTeam ? creatorTeam.id : 0 },
                include: ['player', 'team'],
            });

            const claimerTeamRoster = await this.contestRosterRepository.find({
                where: { teamId: claimerTeam ? claimerTeam.id : 0 },
                include: ['player', 'team'],
            });

            const data = {
                creatorTeamRoster: creatorTeamRoster,
                claimerTeamRoster: claimerTeamRoster,
            };

            return { data: data };
        } catch (error) {
            console.log(error);
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.LEAGUE_CONTEST_ROSTER_FAILED);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.CONTESTS.CREATE_ANY_CONTEST)] })
    @patch(API_ENDPOINTS.LEAGUE.RESYNC, {
        responses: {
            '200': {
                description: 'Resync League.',
            },
        },
    })
    async resyncLeague(
        @requestBody()
        body: Partial<ILeagueResync>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        const validationSchema = {
            leagueKey: IMPORT_LEAGUE_VALIDATOR.leagueKey,
            importSourceId: IMPORT_LEAGUE_VALIDATOR.importSourceId,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const { leagueKey, importSourceId } = body;

        if(importSourceId === 2) {
            //Call yahoo sync method from league service

            // await this.leagueService.resyncYahoo(leagueKey);

            const localLeague = await this.leagueRepository.findOne({
                where: {
                    remoteId: leagueKey,
                },
            });

            const userId = localLeague? localLeague.userId: 0;

            const userData = await this.userRepository.findById(userId);

            const localLeagueId = localLeague? localLeague.id: 0;
            const leagueId = localLeague? Number(localLeague.remoteId): 0;


            const yf = new YahooFantasy(process.env.YAHOO_APPLICATION_KEY, process.env.YAHOO_SECRET_KEY);
            yf.setUserToken(userData.yahooAccessToken);
            yf.setRefreshToken(userData.yahooRefreshToken);

            // @ts-ignore
            const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.SERIALIZABLE);

            try {
                const localPlayers = await this.playerRepository.find();
                const localTeams = await this.teamRepository.find({
                    where: {
                        leagueId: leagueId
                    }
                });

                const teams = await yf.league.teams(leagueId);
                await Promise.all(
                    teams.teams.map(async (team: any) => {
                        const foundLocalTeam = localTeams.find(localTeam => team.team_key === localTeam.remoteId);
                        if (foundLocalTeam) {
                            foundLocalTeam.name = team.name;
                            foundLocalTeam.remoteId = team.team_key;
                            foundLocalTeam.logoUrl = team.team_logos[0].url;
                            foundLocalTeam.wordMarkUrl = team.url;
                            foundLocalTeam.leagueId = leagueId;
                            await this.teamRepository.save(foundLocalTeam);

                            await this.rosterRepository.deleteAll({
                                    teamId: foundLocalTeam.id
                            });

                            const roster = await yf.team.roster(team.team_key);

                            await Promise.all(
                                roster.roster.map(async (remotePlayer: any) => {
                                    if (remotePlayer.selected_position !== 'BN') {
                                        const foundPlayer = await this.leagueService.findPlayer(remotePlayer, localPlayers);

                                        const rosterData = new Roster();
                                        rosterData.teamId = team.team_key;
                                        rosterData.playerId = foundPlayer.id;
                                        rosterData.displayPosition = remotePlayer.display_position;
                                        await this.rosterRepository.create(rosterData, { transaction });
                                    }

                                    return false;
                                }),
                            );
                         }

                        const teamData = new Team();

                        teamData.name = team.name;
                        teamData.remoteId = team.team_key;
                        teamData.logoUrl = team.team_logos[0].url;
                        teamData.wordMarkUrl = team.url;
                        teamData.leagueId = leagueId;
                        const createdTeam = await this.teamRepository.create(teamData, { transaction });

                        const roster = await yf.team.roster(createdTeam.remoteId);

                        await Promise.all(
                            roster.roster.map(async (remotePlayer: any) => {
                                if (remotePlayer.selected_position !== 'BN') {
                                    const foundPlayer = await this.leagueService.findPlayer(remotePlayer, localPlayers);
                                    const rosterData = new Roster();
                                    rosterData.teamId = createdTeam.id;
                                    rosterData.playerId = foundPlayer.id;
                                    rosterData.displayPosition = remotePlayer.display_position;
                                    await this.rosterRepository.create(rosterData, { transaction });
                                }

                                return false;
                            }),
                        );
                    }),
                );

                const league = await yf.league.meta(leagueKey);
                const leagueData = new League();

                leagueData.name = league.name;
                leagueData.syncStatus = 'success';
                leagueData.lastSyncTime = new Date();
                leagueData.userId = userId;

                const updatedLeague = await this.leagueRepository.updateById(localLeagueId, leagueData, { transaction });

                // await transaction.rollback();
                await transaction.commit();


            } catch (error) {
                console.log('🚀 ~ file: league.controller.ts ~ error', error);
                await transaction.rollback();
                throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.RESYNC_FAILED);
            }

            const newLeague = await this.leagueRepository.find({
                where: {
                    remoteId: leagueKey,
                },
                order: ['createdAt DESC'],
                include: [
                    {
                        relation: 'teams',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'members',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'scoringType',
                    },
                ],
            });

            return {
                message: LEAGUE_MESSAGES.RESYNC_SUCCESS,
                data: {
                    league: newLeague,
                },
            };
        } else {
            //Call espn sync method from league service

            // await this.leagueService.resyncESPN(espnS2, swid, leagueKey);

            const newLeague = await this.leagueRepository.find({
                where: {
                    remoteId: leagueKey,
                },
                order: ['createdAt DESC'],
                include: [
                    {
                        relation: 'teams',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'members',
                        scope: {
                            include: ['user'],
                        },
                    },
                    {
                        relation: 'scoringType',
                    },
                ],
            });

            return {
                message: LEAGUE_MESSAGES.RESYNC_SUCCESS,
                data: {
                    league: newLeague,
                },
            };
        }


    }
}
