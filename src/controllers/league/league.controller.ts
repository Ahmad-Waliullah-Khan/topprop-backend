import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import { isEmpty, find } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { SecurityBindings, securityId } from '@loopback/security';
import { repository, FilterExcludingWhere } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, post, requestBody } from '@loopback/rest';
import { API_ENDPOINTS, EMAIL_TEMPLATES, PERMISSIONS } from '@src/utils/constants';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse } from '@src/utils/interfaces';
import { League, Invite, Member } from '@src/models';
import Schema from 'validate';
import { ErrorHandler } from '@src/utils/helpers';
import { UserService } from '@src/services/user.service';
import {
    ILeagueInvitesRequest,
    ICustomUserProfile,
    ILeagueInvitesFetchRequest,
    ILeagueInvitesJoinRequest,
} from '@src/utils/interfaces';
import { INVITE_VALIDATOR } from '@src/utils/validators';
import {
    LeagueRepository,
    MemberRepository,
    TeamRepository,
    InviteRepository,
    UserRepository,
} from '@src/repositories';
import { COMMON_MESSAGES, LEAGUE_MESSAGES } from '@src/utils/messages';

import moment from 'moment';

export class LeagueController {
    constructor(
        @repository(LeagueRepository)
        public leagueRepository: LeagueRepository,
        @repository(MemberRepository)
        public memberRepository: MemberRepository,
        @repository(TeamRepository)
        public teamRepository: TeamRepository,
        @repository(InviteRepository)
        public inviteRepository: InviteRepository,
        @repository(UserRepository)
        public userRepository: UserRepository,
        @service() protected userService: UserService,
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
}
