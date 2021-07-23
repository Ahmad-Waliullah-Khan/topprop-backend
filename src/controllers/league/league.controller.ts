import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId} from '@loopback/security';
import {League} from '@src/models';
import {ContestRosterRepository, LeagueRepository, MemberRepository, PlayerRepository, RosterRepository, TeamRepository} from '@src/repositories';
import {API_ENDPOINTS, PERMISSIONS} from '@src/utils/constants';
import {ErrorHandler} from '@src/utils/helpers';
import {AuthorizationHelpers} from '@src/utils/helpers/authorization.helpers';
import {ICommonHttpResponse, ICustomUserProfile} from '@src/utils/interfaces';
import {ILeagueCreateRequest} from '@src/utils/interfaces/league.interface';
import {COMMON_MESSAGES, LEAGUE_IMPORT_MESSAGES, LEAGUE_MESSAGES} from '@src/utils/messages';
import {LEAGUE_CONTEST_VALIDATOR} from '@src/utils/validators';
import {isEmpty} from 'lodash';
import Schema from 'validate';

export class LeagueController {
    constructor(
        @repository(LeagueRepository)
        public leagueRepository: LeagueRepository,
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

        const { creatorTeamId, claimerTeamId, entryAmount, winBonus, creatorId } = body;

        const creatorTeam = await this.teamRepository.findById(Number(creatorTeamId));
        if (!creatorTeam) throw new HttpErrors.BadRequest(LEAGUE_MESSAGES.CREATOR_TEAM_DOES_NOT_EXIST);

        const claimerTeam = await this.teamRepository.findById(Number(claimerTeamId));
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


        //Do contest calculation
        //Clone roster to contest-roster
        //Save DB



        // fetch the creatorTeam along with players
        // fetch the claimerTeam along with players
        // find the number of players available in the creator team
        // find the number of players available in the claimer team
        // if any of the team contains number of available players <=2 then first sheet calculation
        // if any of the team contains number of available players >=3 and <=6 then second sheet calculation
        // if any of the team contains number of available players >=7 and <=18 then third sheet calculation
        // calculate total projectedFantasy of the players of both team which will be team's projected fantasy
        // Calculate the spread according to spread table
        // calculate winBonus if boolean is set
        // calculate cover
        // calculate maxWin
        //

        return {
            message: LEAGUE_MESSAGES.CREATE_LEAGUE_CONTEST_SUCCESS,
            data: {},
        };

    }
}
