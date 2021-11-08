import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {Filter, FilterExcludingWhere, IsolationLevel, repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId} from '@loopback/security';
import {Bet, ContestRoster, ContestTeam, Invite, League, LeagueContest, Member} from '@src/models';
import {
    BetRepository,
    ConfigRepository,
    ContestRosterRepository,
    ContestTeamRepository,
    ImportSourceRepository,
    InviteRepository,
    LeagueContestRepository,
    LeagueRepository,
    MemberRepository,
    PlayerRepository,
    RosterRepository,
    TeamRepository,
    UserRepository
} from '@src/repositories';
import {ContestService, LeagueService, PaymentGatewayService} from '@src/services';
import {UserService} from '@src/services/user.service';
import {
    API_ENDPOINTS,
    CONTEST_STATUSES,
    CONTEST_TYPES,
    EMAIL_TEMPLATES,
    PERMISSIONS,
    SCORING_TYPE,
    SPREAD_TYPE
} from '@src/utils/constants';
import {ErrorHandler, MiscHelpers} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {
    ICommonHttpResponse,
    ICustomUserProfile,
    ILeagueCalculateRequest,
    ILeagueClaimContestRequest,
    ILeagueCreateRequest,
    ILeagueInvitesFetchRequest,
    ILeagueInvitesJoinRequest,
    ILeagueInvitesRequest,
    ILeagueResync
} from '@src/utils/interfaces';
import {COMMON_MESSAGES, CONTEST_MESSAGES, LEAGUE_MESSAGES} from '@src/utils/messages';
import {INVITE_VALIDATOR, LEAGUE_CONTEST_CLAIM_VALIDATOR, LEAGUE_CONTEST_VALIDATOR} from '@src/utils/validators';
import {find, isEmpty} from 'lodash';
import moment from 'moment';
import {v4 as uuidv4} from 'uuid';
import Schema from 'validate';
import logger from '../../utils/logger';
// const YahooFantasy = require('yahoo-fantasy');

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
        @repository(ContestTeamRepository)
        public contestTeamRepository: ContestTeamRepository,
        @repository(ImportSourceRepository)
        public importSourceRepository: ImportSourceRepository,
        @repository(ConfigRepository)
        public configRepository: ConfigRepository,
        @service() private leagueService: LeagueService,
        @service() private paymentGatewayService: PaymentGatewayService,
        @service() private userService: UserService,
        @service() private contestService: ContestService,
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
                        include: [
                            {
                                relation: 'user',
                            },
                            {
                                relation: 'rosters',
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
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
        @param.filter(League, { exclude: 'where' }) filter?: FilterExcludingWhere<League>,
    ): Promise<ICommonHttpResponse<any>> {
        const userId = +currentUser[securityId];
        const members = await this.memberRepository.find({
            where: {
                userId: userId,
            },
        });

        const leagueIdList = members.map(member => member.leagueId);

        if (!leagueIdList.includes(id)) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.DO_NOT_BELONG);

        const includes = await this.leagueService.fetchLeagueInclude();
        // @ts-ignore
        const leagues = await this.leagueRepository.findById(id, includes);
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

        // const filteredInvitees = MiscHelpers.getUniqueItemsByProperties(invitees, 'email');

        const uniqueKey = 'email';
        const filteredInvitees = [...new Map(invitees.map(item => [item[uniqueKey], item])).values()];

        try {
            await Promise.all(
                filteredInvitees.map(async (invitee: any) => {
                    const foundMember = find(league.members, (member: any) => {
                        return invitee.email.toLowerCase() === member.user.email.toLowerCase();
                    });

                    if (foundMember) {
                        if (invitee.teamId) {
                            await this.teamRepository.updateAll(
                                {
                                    userId: undefined,
                                    updatedAt: moment().toDate().toString(),
                                },
                                { userId: foundMember.userId, leagueId: id },
                            );

                            await this.teamRepository.updateById(invitee.teamId, {
                                userId: foundMember.userId,
                                updatedAt: moment().toDate().toString(),
                            });
                        }
                    } else {
                        const newFoundMember = await this.memberRepository.findOne({
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

                        if (newFoundMember) {
                            InviteData.memberId = newFoundMember.id;
                        }

                        const invite = await this.inviteRepository.create(InviteData);

                        const clientHost = process.env.CLIENT_HOST;

                        await this.userService.sendEmail(
                            user,
                            EMAIL_TEMPLATES.LEAGUE_INVITE,
                            {
                                user: {
                                    fullName: '',
                                },
                                text: {
                                    title: ``,
                                    subtitle: `You have been invited to ${league.name}. The invite was sent to you by ${user.fullName}. Click on the button below to take your league to new heights.`,
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

            const includes = await this.leagueService.fetchLeagueInclude();

            const updatedLeague = await this.leagueRepository.findById(id, includes);

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
    @post(API_ENDPOINTS.LEAGUE.FETCH_PUBLIC_INVITE, {
        responses: {
            '200': {
                description: 'Fetch League Public invitation',
            },
        },
    })
    async fetchPublicLeagueInvite(
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
            const league = await this.leagueRepository.findOne({
                where: {
                    inviteToken: body.token,
                },
                include: ['user', 'teams', 'members', 'scoringType'],
            });

            return {
                message: LEAGUE_MESSAGES.INVITATION_FETCHING_SUCCESS,
                data: league,
            };
        } catch (error) {
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

        if (user.email.toLowerCase() !== invite?.email.toLowerCase())
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
                const team = await this.teamRepository.findById(invite.teamId);

                if (!team.userId) {
                    await this.teamRepository.updateById(invite.teamId, {
                        userId: user.id,
                        updatedAt: moment().toDate().toString(),
                    });
                }
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

            const includes = await this.leagueService.fetchLeagueInclude();

            const updatedLeague = await this.leagueRepository.findById(invite.leagueId, includes);

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
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @post(API_ENDPOINTS.LEAGUE.PUBLIC_JOIN, {
        responses: {
            '200': {
                description: 'Join League with a Public invitation',
            },
        },
    })
    async joinLeaguePublicInvite(
        @requestBody()
        body: Partial<ILeagueInvitesFetchRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);
        const userId = +currentUser[securityId];
        const validationSchema = {
            token: INVITE_VALIDATOR.token,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const user = await this.userRepository.findById(userId);

        const league = await this.leagueRepository.findOne({
            where: {
                inviteToken: body.token,
            },
            include: ['teams', 'members', 'scoringType'],
        });

        const leagueId = league?.id || 0;

        const member = await this.memberRepository.findOne({
            where: {
                leagueId,
                userId: user.id,
            },
        });

        if (member) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.EXISTING_MEMBER);

        try {
            const memberData = new Member();
            memberData.leagueId = leagueId;
            memberData.userId = user.id;

            await this.memberRepository.create(memberData);

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

            const includes = await this.leagueService.fetchLeagueInclude();

            const updatedLeague = await this.leagueRepository.findById(league?.id || 0, includes);

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
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @post(API_ENDPOINTS.LEAGUE.CONTEST.CALCULATE_VALUES, {
        responses: {
            '200': {
                description: 'Calculate Contest Values',
            },
        },
    })
    async calculateContestValues(
        @requestBody()
        body: Partial<ILeagueCalculateRequest>,
        @inject(SecurityBindings.USER) currentUser: ICustomUserProfile,
    ): Promise<ICommonHttpResponse<any>> {
        if (!body || isEmpty(body)) throw new HttpErrors.BadRequest(COMMON_MESSAGES.MISSING_OR_INVALID_BODY_REQUEST);

        if (!body.creatorId) body.creatorId = +currentUser[securityId];

        const userId = +currentUser[securityId];

        const validationSchema = {
            creatorTeamId: LEAGUE_CONTEST_VALIDATOR.creatorTeamId,
            claimerTeamId: LEAGUE_CONTEST_VALIDATOR.claimerTeamId,
            entryAmount: LEAGUE_CONTEST_VALIDATOR.entryAmount,
        };

        const validation = new Schema(validationSchema, { strip: true });
        const validationErrors = validation.validate(body);
        if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));

        const config = await this.configRepository.findOne({ order: ['id DESC'] });

        if (!config?.contestCreationEnabled) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.GAME_ONGOING);

        const creatorTeamId = body.creatorTeamId || 0;
        const claimerTeamId = body.claimerTeamId || 0;

        const creatorTeam = await this.teamRepository.findById(creatorTeamId, { include: ['rosters'] });
        if (!creatorTeam) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATOR_TEAM_DOES_NOT_EXIST);

        const claimerTeam = await this.teamRepository.findById(claimerTeamId, { include: ['rosters'] });
        if (!claimerTeam) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CLAIMER_TEAM_DOES_NOT_EXIST);

        const leagueId = creatorTeam.leagueId;

        const league = await this.leagueRepository.findById(leagueId);

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

            if (remainingClaimerPlayers.length === 0 && remainingCreatorPlayers.length === 0)
                throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NO_REMAINING_PLAYERS_BOTH_TEAM);

            const completedClaimerPlayers = claimerTeamRoster.filter(roster => {
                return roster.player?.isOver;
            });

            const creatorTeamPlayerProjFantasy = remainingCreatorPlayers.map(roster => {
                return roster.player ? roster.player.projectedFantasyPoints : 0;
            });

            const creatorTeamPlayerFantasy = completedCreatorPlayers.map(roster => {
                let creatorTeamFantasyPoints = 0;
                switch (league.scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        creatorTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsHalfPpr) : 0;
                        break;
                    case SCORING_TYPE.FULLPPR:
                        creatorTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsFullPpr) : 0;
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        creatorTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPoints) : 0;
                        break;
                }
                return creatorTeamFantasyPoints;
            });

            const claimerTeamPlayerProjFantasy = remainingClaimerPlayers.map(roster => {
                return roster.player ? roster.player.projectedFantasyPoints : 0;
            });

            const claimerTeamPlayerFantasy = completedClaimerPlayers.map(roster => {
                let claimerTeamFantasyPoints = 0;
                switch (league.scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        claimerTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsHalfPpr) : 0;
                        break;
                    case SCORING_TYPE.FULLPPR:
                        claimerTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsFullPpr) : 0;
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        claimerTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPoints) : 0;
                        break;
                }
                return claimerTeamFantasyPoints;
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
                totalCreatorTeamProjFantasy +
                (creatorTeamPlayerFantasy.length > 0
                    ? creatorTeamPlayerFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0);

            let totalClaimerTeamProjFantasy =
                claimerTeamPlayerProjFantasy.length > 0
                    ? claimerTeamPlayerProjFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0;

            totalClaimerTeamProjFantasy =
                totalClaimerTeamProjFantasy +
                (claimerTeamPlayerFantasy.length > 0
                    ? claimerTeamPlayerFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0);

            // TODO remove the following lines
            // totalCreatorTeamProjFantasy = 200;
            // totalClaimerTeamProjFantasy = 215;
            const user = await this.userRepository.findById(userId);

            const funds = await this.paymentGatewayService.getTopPropBalance(user.id);
            const entryAmount = body.entryAmount ? (body.entryAmount || 0) * 100 : 0;
            if (funds < entryAmount) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

            const winBonusFlag = false;

            let creatorTeamSpread = 0;
            const claimerTeamSpread = 0;
            const creatorTeamCover = 0;
            const claimerTeamCover = 0;
            let creatorTeamCoverWithBonus = 0;
            let creatorTeamCoverWithoutBonus = 0;
            let creatorTeamWinBonus = 0;
            const claimerTeamWinBonus = 0;

            let contestType = SPREAD_TYPE.LEAGUE_1_TO_2;

            const projSpreadDiff = Number(totalCreatorTeamProjFantasy) - Number(totalClaimerTeamProjFantasy);

            const spreadDiff = Math.abs(projSpreadDiff);

            if (spreadDiff > 50) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.POINT_SPREAD_TOO_LARGE);

            const remainingPlayers =
                remainingClaimerPlayers.length > remainingCreatorPlayers.length
                    ? remainingCreatorPlayers.length
                    : remainingClaimerPlayers.length;

            if (remainingPlayers <= 2) {
                creatorTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'creator',
                    SPREAD_TYPE.LEAGUE_1_TO_2,
                );

                creatorTeamCoverWithBonus = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    true,
                    SPREAD_TYPE.LEAGUE_1_TO_2,
                );

                creatorTeamCoverWithoutBonus = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    false,
                    SPREAD_TYPE.LEAGUE_1_TO_2,
                );

                creatorTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          creatorTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_1_TO_2,
                      )
                    : 0;

                contestType = SPREAD_TYPE.LEAGUE_1_TO_2;
            }

            if (remainingPlayers >= 3 && remainingPlayers <= 6) {
                creatorTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'creator',
                    SPREAD_TYPE.LEAGUE_3_TO_6,
                );

                creatorTeamCoverWithBonus = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    true,
                    SPREAD_TYPE.LEAGUE_3_TO_6,
                );

                creatorTeamCoverWithoutBonus = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    false,
                    SPREAD_TYPE.LEAGUE_3_TO_6,
                );

                creatorTeamWinBonus = winBonusFlag
                    ? await this.leagueService.calculateWinBonus(
                          creatorTeamSpread,
                          entryAmount,
                          SPREAD_TYPE.LEAGUE_3_TO_6,
                      )
                    : 0;

                contestType = SPREAD_TYPE.LEAGUE_3_TO_6;
            }

            if (remainingPlayers >= 7 && remainingPlayers <= 18) {
                creatorTeamSpread = await this.leagueService.calculateSpread(
                    Number(totalCreatorTeamProjFantasy),
                    Number(totalClaimerTeamProjFantasy),
                    'creator',
                    SPREAD_TYPE.LEAGUE_7_TO_18,
                );

                creatorTeamCoverWithBonus = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    true,
                    SPREAD_TYPE.LEAGUE_7_TO_18,
                );

                creatorTeamCoverWithoutBonus = await this.leagueService.calculateCover(
                    creatorTeamSpread,
                    entryAmount,
                    false,
                    SPREAD_TYPE.LEAGUE_7_TO_18,
                );

                contestType = SPREAD_TYPE.LEAGUE_7_TO_18;
            }

            const creatorTeamMaxWin = Number(creatorTeamCoverWithBonus) + Number(creatorTeamWinBonus);
            const claimerTeamMaxWin = Number(claimerTeamCover) + Number(claimerTeamWinBonus);

            const spreadValue = entryAmount * 0.85;
            const mlValue = entryAmount - spreadValue;

            return {
                message: LEAGUE_MESSAGES.CREATE_LEAGUE_CALCULATIONS_SUCCESS,
                data: {
                    withWinBonus: {
                        spread: creatorTeamSpread,
                        cover: Number(creatorTeamCoverWithBonus),
                        winBonus: 0,
                        maxWin: Number(creatorTeamCoverWithBonus) + Number(creatorTeamWinBonus),
                    },
                    withoutWinBonus: {
                        spread: creatorTeamSpread,
                        cover: Number(creatorTeamCoverWithoutBonus),
                        winBonus: 0,
                        maxWin: Number(creatorTeamCoverWithoutBonus) + Number(creatorTeamWinBonus),
                    },
                },
            };
        } catch (error) {
            console.log('🚀 ~ file: league.controller.ts ~ line 807 ~ LeagueController ~ error', error);
            logger.error(JSON.stringify(error));
            if (error.name === 'BadRequestError') {
                throw new HttpErrors.BadRequest(error.message);
            }
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATE_LEAGUE_CALCULATIONS_FAILED);
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

        const leagueId = creatorTeam.leagueId;

        const league = await this.leagueRepository.findById(leagueId);

        const member = await this.memberRepository.find({
            where: {
                and: [{ userId: body.creatorId }, { leagueId: creatorTeam.leagueId }],
            },
        });

        if (member.length <= 0) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_A_MEMBER);

        if (creatorTeam.leagueId !== claimerTeam.leagueId)
            throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NOT_SAME_LEAGUE);

        const scoringTypeId = league.scoringTypeId;
        const transaction = await this.leagueRepository.beginTransaction(IsolationLevel.READ_COMMITTED);

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

            if (remainingClaimerPlayers.length === 0 && remainingCreatorPlayers.length === 0)
                throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.NO_REMAINING_PLAYERS_BOTH_TEAM);

            const completedClaimerPlayers = claimerTeamRoster.filter(roster => {
                return roster.player?.isOver;
            });

            const creatorTeamPlayerProjFantasy = remainingCreatorPlayers.map(roster => {
                return roster.player ? roster.player.projectedFantasyPoints : 0;
            });

            const creatorTeamPlayerFantasy = completedCreatorPlayers.map(roster => {
                let creatorTeamFantasyPoints = 0;
                switch (scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        creatorTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsHalfPpr) : 0;
                        break;
                    case SCORING_TYPE.FULLPPR:
                        creatorTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsFullPpr) : 0;
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        creatorTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPoints) : 0;
                        break;
                }
                return creatorTeamFantasyPoints;
            });

            const claimerTeamPlayerProjFantasy = remainingClaimerPlayers.map(roster => {
                return roster.player ? roster.player.projectedFantasyPoints : 0;
            });

            const claimerTeamPlayerFantasy = completedClaimerPlayers.map(roster => {
                let claimerTeamFantasyPoints = 0;
                switch (league.scoringTypeId) {
                    case SCORING_TYPE.HALFPPR:
                        claimerTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsHalfPpr) : 0;
                        break;
                    case SCORING_TYPE.FULLPPR:
                        claimerTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPointsFullPpr) : 0;
                        break;
                    case SCORING_TYPE.NOPPR:
                        // Standard PPR
                        claimerTeamFantasyPoints = roster.player ? Number(roster.player.fantasyPoints) : 0;
                        break;
                }
                return claimerTeamFantasyPoints;
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
                totalCreatorTeamProjFantasy +
                (creatorTeamPlayerFantasy.length > 0
                    ? creatorTeamPlayerFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0);

            let totalClaimerTeamProjFantasy =
                claimerTeamPlayerProjFantasy.length > 0
                    ? claimerTeamPlayerProjFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0;

            totalClaimerTeamProjFantasy =
                totalClaimerTeamProjFantasy +
                (claimerTeamPlayerFantasy.length > 0
                    ? claimerTeamPlayerFantasy.reduce((accumulator, currentValue) => {
                          const total = Number(accumulator);
                          const value = Number(currentValue);
                          return total + value;
                      }, 0)
                    : 0);

            // TODO remove the following lines
            // totalCreatorTeamProjFantasy = 200;
            // totalClaimerTeamProjFantasy = 215;
            const user = await this.userRepository.findById(userId);

            const funds = await this.paymentGatewayService.getTopPropBalance(user.id);
            const entryAmount = body.entryAmount ? body.entryAmount * 100 : 0;
            if (funds < entryAmount) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

            const winBonusFlag = false;

            let creatorTeamSpread = 0;
            let claimerTeamSpread = 0;
            let creatorTeamCover = 0;
            let claimerTeamCover = 0;
            let creatorTeamWinBonus = 0;
            let claimerTeamWinBonus = 0;

            let contestType = SPREAD_TYPE.LEAGUE_1_TO_2;

            const projSpreadDiff = Number(totalCreatorTeamProjFantasy) - Number(totalClaimerTeamProjFantasy);

            const spreadDiff = Math.abs(projSpreadDiff);

            if (spreadDiff > 50) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.POINT_SPREAD_TOO_LARGE);

            const remainingPlayers =
                remainingClaimerPlayers.length > remainingCreatorPlayers.length
                    ? remainingCreatorPlayers.length
                    : remainingClaimerPlayers.length;

            if (remainingPlayers <= 2) {
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

            if (remainingPlayers >= 3 && remainingPlayers <= 6) {
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

            if (remainingPlayers >= 7 && remainingPlayers <= 18) {
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

            const creatorContestTeamData = new ContestTeam();
            creatorContestTeamData.teamId = creatorTeamId;

            const createdCreatorContestTeam = await this.contestTeamRepository.create(creatorContestTeamData, {
                transaction,
            });

            creatorTeam?.rosters?.map(async player => {
                const contestRosterData = new ContestRoster();
                contestRosterData.contestTeamId = createdCreatorContestTeam.id;
                contestRosterData.playerId = player.playerId;
                await this.contestRosterRepository.create(contestRosterData, { transaction });
                return false;
            });

            const claimerContestTeamData = new ContestTeam();
            claimerContestTeamData.teamId = claimerTeamId;

            const createdClaimerContestTeam = await this.contestTeamRepository.create(claimerContestTeamData, {
                transaction,
            });

            claimerTeam?.rosters?.map(async player => {
                const contestRosterData = new ContestRoster();
                contestRosterData.contestTeamId = createdClaimerContestTeam.id;
                contestRosterData.playerId = player.playerId;
                await this.contestRosterRepository.create(contestRosterData, { transaction });
                return false;
            });

            leagueContestData.creatorContestTeamId = createdCreatorContestTeam.id;
            leagueContestData.claimerContestTeamId = createdClaimerContestTeam.id;

            const contestData = leagueContestData;

            const createdLeagueContest = await this.leagueContestRepository.create(leagueContestData, { transaction });

            const bet = new Bet();

            // bet.contenderId = creatorTeamId;
            bet.userId = userId;
            bet.contestType = 'League';
            bet.amount = entryAmount;
            bet.contestId = createdLeagueContest.id;

            await this.betRepository.create(bet, { transaction });

            await transaction.commit();

            return {
                message: LEAGUE_MESSAGES.CREATE_LEAGUE_CONTEST_SUCCESS,
                data: {
                    contest: createdLeagueContest,
                    // myContests: myContests
                },
            };
        } catch (error) {
            console.log('🚀 ~ file: league.controller.ts ~ line 1266 ~ LeagueController ~ error', error);
            logger.error(error.message);
            await transaction.rollback();
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

        const user = await this.userRepository.findById(userId);

        const funds = await this.paymentGatewayService.getTopPropBalance(user.id);
        const entryAmount = +leagueContestData.entryAmount || 0;
        if (funds < entryAmount) throw new HttpErrors.BadRequest(CONTEST_MESSAGES.INSUFFICIENT_BALANCE);

        leagueContestData.claimerId = body.claimerId;
        leagueContestData.status = CONTEST_STATUSES.MATCHED;

        const updatedContest = await this.leagueContestRepository.updateById(leagueContestId, leagueContestData);

        const bet = new Bet();

        // bet.contenderId = leagueContestData.claimerTeamId;
        bet.userId = userId;
        bet.contestType = 'League';
        bet.amount = leagueContestData.entryAmount;
        bet.contestId = leagueContestId;

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

        const creatorTeam = await this.teamRepository.findById(leagueContestData.creatorTeamId);
        const claimerTeam = await this.teamRepository.findById(leagueContestData.claimerTeamId);
        const creatorUser = await this.userRepository.findById(leagueContestData.creatorId);
        const claimerUser = await this.userRepository.findById(leagueContestData.claimerId);
        // const league = await this.leagueRepository.findById(leagueContestData.leagueId);

        let isCreatorTeamSvgLogo = false;
        let isClaimerTeamSvgLogo = false;

        if (creatorTeam.logoUrl.includes(".svg") || creatorTeam.logoUrl.slice(creatorTeam.logoUrl.length - 4) === ".svg") {
            isCreatorTeamSvgLogo = true;
        }

        if (claimerTeam.logoUrl.includes(".svg") || claimerTeam.logoUrl.slice(claimerTeam.logoUrl.length - 4) === ".svg") {
            isClaimerTeamSvgLogo = true;
        }

        await this.userService.sendEmail(creatorUser, EMAIL_TEMPLATES.LEAGUE_CONTEST_CLAIMED_BY_CLAIMER, {
            creatorUser,
            user,
            claimerTeam,
            creatorTeam,
            claimerUser,
            leagueContestData,
            isCreatorTeamSvgLogo,
            isClaimerTeamSvgLogo,
            moment: moment,
            c2d: MiscHelpers.c2d,
            text: {
                title: `${
                    creatorUser ? creatorUser.fullName : ''
                }, your TopProp contest has been claimed and is officially cleared for takeoff!`,
                subtitle: 'Good luck!',
            },
        });

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
            const includes = await this.leagueService.fetchLeagueContestInclude();
            const leagueContest = await this.leagueContestRepository.findById(id, {
                include: includes.include,
            });

            const data = {
                leagueContest: leagueContest,
                creatorTeamRoster: leagueContest?.creatorContestTeam,
                claimerTeamRoster: leagueContest?.claimerContestTeam,
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

        // const validationSchema = {
        //     leagueId: FETCH_LEAGUE_VALIDATOR.leagueId,
        // };

        // const validation = new Schema(validationSchema, { strip: true });
        // const validationErrors = validation.validate(body);
        // if (validationErrors.length) throw new HttpErrors.BadRequest(ErrorHandler.formatError(validationErrors));
        const leagueId = body.leagueId || 0;

        const existingLeague = await this.leagueRepository.findById(Number(leagueId));

        const importSourceData = await this.importSourceRepository.findById(existingLeague.importSourceId);
        const importSource = importSourceData.name;

        if (importSource === 'yahoo') {
            if (await this.leagueService.resyncYahoo(leagueId)) {
                const includes = await this.leagueService.fetchLeagueInclude();
                // @ts-ignore
                const updatedLeague = await this.leagueRepository.findById(leagueId, includes);

                return {
                    message: LEAGUE_MESSAGES.RESYNC_SUCCESS,
                    data: updatedLeague,
                };
            } else {
                throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.RESYNC_FAILED);
            }
        }
        if (importSource === 'espn') {
            //Call espn sync method from league service
            if (await this.leagueService.resyncESPN(leagueId || 0)) {
                const includes = await this.leagueService.fetchLeagueInclude();
                // @ts-ignore
                const updatedLeague = await this.leagueRepository.findById(leagueId, includes);

                return {
                    message: LEAGUE_MESSAGES.RESYNC_SUCCESS,
                    data: updatedLeague,
                };
            } else {
                throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.RESYNC_FAILED);
            }
        }

        throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.RESYNC_FAILED);
    }
}
