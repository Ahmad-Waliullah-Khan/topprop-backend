import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject, service } from '@loopback/core';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, post, requestBody, Response, RestBindings } from '@loopback/rest';
import { Player } from '@src/models';
import { ContestRepository, PlayerRepository, TeamRepository } from '@src/repositories';
import { EmailService, MultiPartyFormService, SportsDataService } from '@src/services';
import {
    API_ENDPOINTS,
    CONTEST_STATUSES,
    DEFAULT_CSV_FILE_PLAYERS_HEADERS,
    EMAIL_TEMPLATES,
    LOBBY_SPREAD_LOWER_LIMIT,
    LOBBY_SPREAD_UPPER_LIMIT,
    PERMISSIONS,
    PLAYER_POSITIONS,
    TOP_PLAYERS,
    TOP_PLAYER_POSITIONS,
} from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, IImportedPlayer, IRemotePlayer } from '@src/utils/interfaces';
import { PLAYER_MESSAGES } from '@src/utils/messages';
import { IMPORTED_PLAYER_VALIDATORS } from '@src/utils/validators';
import chalk from 'chalk';
import * as fastCsv from 'fast-csv';
import { isEqual, isNumber, sortBy, values } from 'lodash';
import moment from 'moment';
import Schema, { SchemaDefinition } from 'validate';

export class PlayerController {
    constructor(
        @repository(PlayerRepository)
        private playerRepository: PlayerRepository,
        @repository(TeamRepository) private teamRepository: TeamRepository,
        @repository(ContestRepository) private contestRepository: ContestRepository,
        @service() protected multipartyFormService: MultiPartyFormService,
        @service() private emailService: EmailService,
        @service() private sportDataService: SportsDataService,
    ) {}

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.IMPORT_PLAYERS)] })
    @post(API_ENDPOINTS.PLAYERS.GOOGLE_SHEETS_IMPORT)
    async googleSheetsImport(
        @inject(RestBindings.Http.RESPONSE) res: Response,
        @param.header.string('g-sheets-auth-header') gSheetsAuthHeader: string,
        @requestBody() body: { data: IImportedPlayer[] },
    ): Promise<void> {
        res.sendStatus(200);

        if (!gSheetsAuthHeader || !isEqual(gSheetsAuthHeader, process.env.GOOGLE_APP_SCRIPT_AUTH_HEADER)) return;
        const validationSchema: SchemaDefinition = {
            name: IMPORTED_PLAYER_VALIDATORS.name,
            position: IMPORTED_PLAYER_VALIDATORS.position,
            team: IMPORTED_PLAYER_VALIDATORS.team,
            remoteTeamId: IMPORTED_PLAYER_VALIDATORS.remoteTeamId,
            remoteId: IMPORTED_PLAYER_VALIDATORS.remoteId,
            photoUrl: IMPORTED_PLAYER_VALIDATORS.photoUrl,
            points0: IMPORTED_PLAYER_VALIDATORS.points(0),
            points2: IMPORTED_PLAYER_VALIDATORS.points(2),
            points4: IMPORTED_PLAYER_VALIDATORS.points(4),
            points6: IMPORTED_PLAYER_VALIDATORS.points(6),
            points8: IMPORTED_PLAYER_VALIDATORS.points(8),
            points10: IMPORTED_PLAYER_VALIDATORS.points(10),
            points12: IMPORTED_PLAYER_VALIDATORS.points(12),
            points14: IMPORTED_PLAYER_VALIDATORS.points(14),
            points16: IMPORTED_PLAYER_VALIDATORS.points(16),
            points18: IMPORTED_PLAYER_VALIDATORS.points(18),
            points20: IMPORTED_PLAYER_VALIDATORS.points(20),
            points22: IMPORTED_PLAYER_VALIDATORS.points(22),
            points24: IMPORTED_PLAYER_VALIDATORS.points(24),
            points26: IMPORTED_PLAYER_VALIDATORS.points(26),
            points28: IMPORTED_PLAYER_VALIDATORS.points(28),
            points30: IMPORTED_PLAYER_VALIDATORS.points(30),
            points32: IMPORTED_PLAYER_VALIDATORS.points(32),
            points34: IMPORTED_PLAYER_VALIDATORS.points(34),
            points36: IMPORTED_PLAYER_VALIDATORS.points(36),
            points38: IMPORTED_PLAYER_VALIDATORS.points(38),
            points40: IMPORTED_PLAYER_VALIDATORS.points(40),
            points42: IMPORTED_PLAYER_VALIDATORS.points(42),
            points44: IMPORTED_PLAYER_VALIDATORS.points(44),
            points46: IMPORTED_PLAYER_VALIDATORS.points(46),
            points48: IMPORTED_PLAYER_VALIDATORS.points(48),
            points50: IMPORTED_PLAYER_VALIDATORS.points(50),
        };

        const validation = new Schema(validationSchema, { strip: true });

        // body.data = body.data.slice(0, 50);
        let errors: string[] = [];
        await this.playerRepository.updateAll({ available: false });

        for (let index = 0; index < body.data.length; index++) {
            const row = index + 2;
            const player = body.data[index];
            if (!player.available) continue;
            const validationErrors = validation.validate(player);
            if (validationErrors.length) {
                const errorMapped = validationErrors.map((error: any) => `Error at row: ${row} - ${error.message}`);
                errors = [...errors, ...errorMapped];
            } else {
                try {
                    await this.upsertPlayer(player, row);
                } catch (error) {
                    errors = [...errors, error.message];
                }
            }
        }

        //* IF ERRORS SEND EMAIL BUT CONTINUE THE FLOW
        const template = EMAIL_TEMPLATES.ADMIN_IMPORT_PLAYERS_UPDATE;
        const locals = {
            targetResources: 'Players - Google Sheets',
            importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
            text: {
                title: `TopProp - Imported Players Update`,
                subtitle: `Here is an update regarding the imported players.`,
            },
            errors,
        };

        this.emailService.sendEmail({
            template,
            message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
            locals,
        });

        try {
            //* HANDLE UNAVAILABLE PLAYERS
            const unavailablePlayers = await this.playerRepository.find({ where: { available: false } });
            const unavailablePlayerIds = unavailablePlayers.map(player => player.id);

            const contests = await this.contestRepository.find({
                where: {
                    and: [
                        { or: [{ status: CONTEST_STATUSES.OPEN }, { status: CONTEST_STATUSES.MATCHED }] },
                        { creatorPlayerId: { inq: unavailablePlayerIds } },
                    ],
                },
            });

            for (let index = 0; index < contests.length; index++) {
                const contest = contests[index];
                contest.status = CONTEST_STATUSES.CLOSED;
                contest.ended = true;
                contest.endedAt = moment().toDate();
                await this.contestRepository.save(contest, { refundBets: true, skipGameValidation: true });
            }
        } catch (error) {
            console.error(`Error upserting players from google sheets. Error:`, error);
            this.emailService.sendEmail({
                template: EMAIL_TEMPLATES.ADMIN_IMPORT_PLAYERS_UPDATE,
                message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
                locals: {
                    targetResources: 'Players - Google Sheets',
                    importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
                    errors: [...errors, error.message || 'Unknown Error. Try again.'],
                },
            });
        }
    }

    //!!DEPRECATED
    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.IMPORT_PLAYERS)] })
    // @post(API_ENDPOINTS.PLAYERS.IMPORT)
    // async create(
    //     @requestBody.file()
    //     req: Request,
    // ): Promise<void> {
    //     try {
    //         // await this.playerRepository.updateAll({ available: true });
    //         const { files, fields } = await this.multipartyFormService.getFilesAndFields(req, '25MB');

    //         // if (isEmpty(fields) || !fields.type) throw new HttpErrors.BadRequest(PLAYER_MESSAGES.PLAYERS_FILE_INVALID_TYPE);

    //         if (isEmpty(files)) throw new HttpErrors.BadRequest(FILE_MESSAGES.FILE_MISSING);

    //         const playersFile = files[FILE_NAMES.PLAYERS];
    //         if (!playersFile) {
    //             this.multipartyFormService.removeFiles(files);
    //             throw new HttpErrors.BadRequest(FILE_MESSAGES.FILE_MISSING);
    //         }

    //         const allowedContentType = 'text/csv';

    //         let fileContentType = playersFile.headers['content-type'];

    //         if (!this.multipartyFormService.isContentType(allowedContentType, fileContentType)) {
    //             this.multipartyFormService.removeFiles(files);
    //             throw new HttpErrors.UnsupportedMediaType(FILE_MESSAGES.FILE_INVALID(allowedContentType));
    //         }

    //         const errors: string[] = [];
    //         const promises: Promise<void>[] = [];

    //         const csvStream = csv().fromStream(createReadStream(playersFile.path));

    //         csvStream.on('header', async (header: string[]) => {
    //             if (!this.validHeaders(header)) errors.push('Invalid CSV Header');
    //         });

    //         csvStream.on('error', error => {
    //             errors.push(error.message);
    //         });

    //         csvStream.on('data', data => {
    //             if (errors.length) return;

    //             const stringifiedData = data.toString('utf8');
    //             const parsedData: IImportedPlayer = JSON.parse(stringifiedData);

    //             if (!this.validPlayer(parsedData)) errors.push(stringifiedData);
    //             else promises.push(this.upsertPlayer(parsedData));
    //         });

    //         csvStream.on('done', async err => {
    //             this.multipartyFormService.removeFiles(files);

    //             if (err) errors.push(err.message);

    //             if (errors.length) {
    //                 this.emailService.sendEmail({
    //                     template: EMAIL_TEMPLATES.ADMIN_IMPORT_DATA_FAILURE,
    //                     message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
    //                     locals: {
    //                         targetResources: 'Players',
    //                         importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
    //                         errors,
    //                     },
    //                 });
    //                 return;
    //             }
    //             try {
    //                 await this.playerRepository.updateAll({ available: false });
    //                 await Promise.all(promises);
    //                 this.emailService.sendEmail({
    //                     template: EMAIL_TEMPLATES.ADMIN_IMPORT_DATA_SUCCESS,
    //                     message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
    //                     locals: {
    //                         targetResources: 'Players',
    //                         importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
    //                     },
    //                 });

    //                 //* HANDLE UNAVAILABLE PLAYERS
    //                 const unavailablePlayers = await this.playerRepository.find({ where: { available: false } });
    //                 const unavailablePlayerIds = unavailablePlayers.map(player => player.id);

    //                 const contests = await this.contestRepository.find({
    //                     where: {
    //                         and: [
    //                             { or: [{ status: CONTEST_STATUSES.OPEN }, { status: CONTEST_STATUSES.MATCHED }] },
    //                             { playerId: { inq: unavailablePlayerIds } },
    //                         ],
    //                     },
    //                 });

    //                 for (let index = 0; index < contests.length; index++) {
    //                     const contest = contests[index];
    //                     contest.status = CONTEST_STATUSES.CLOSED;
    //                     contest.ended = true;
    //                     contest.endedAt = moment().toDate();
    //                     await this.contestRepository.save(contest, { refundBets: true, skipGameValidation: true });
    //                 }
    //             } catch (error) {
    //                 errors.push(err.message);
    //                 console.error(`Error upserting players. Error:`, error);
    //                 this.emailService.sendEmail({
    //                     template: EMAIL_TEMPLATES.ADMIN_IMPORT_DATA_FAILURE,
    //                     message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
    //                     locals: {
    //                         targetResources: 'Players',
    //                         importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
    //                         errors,
    //                     },
    //                 });
    //             }
    //         });
    //     } catch (error) {
    //         ErrorHandler.httpError(error);
    //     }
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.EXPORT_PLAYERS)] })
    @post(API_ENDPOINTS.PLAYERS.EXPORT)
    async exportRemotePlayers(@inject(RestBindings.Http.RESPONSE) res: Response): Promise<void> {
        try {
            const remotePlayers: IRemotePlayer[] = await this.sportDataService.availablePlayers();

            const stream = fastCsv.format({
                headers: true,
                transform: this.playersCsvTransformer,
            });

            const filteredRemotePlayers = remotePlayers
                .filter(
                    player =>
                        isEqual(player.Position, 'QB') ||
                        isEqual(player.Position, 'RB') ||
                        isEqual(player.Position, 'TE') ||
                        isEqual(player.Position, 'WR'),
                )
                .filter(player => player.Team && player.TeamID && isEqual(player.Status, 'Active'));

            const sortedRemotePlayers = sortBy(filteredRemotePlayers, ['Name']);

            for (let index = 0; index < sortedRemotePlayers.length; index++) {
                const element = sortedRemotePlayers[index];
                stream.write(element);
            }
            stream.end();

            res.setHeader('Content-Disposition', `attachment; filename=remote-players.csv`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.writeHead(200, {
                'Content-Type': 'text/csv',
            });

            res.flushHeaders();
            stream.pipe(res);
        } catch (error) {
            ErrorHandler.httpError(error);
        }
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.COUNT_PLAYERS)] })
    @get(API_ENDPOINTS.PLAYERS.COUNT, {
        responses: {
            '200': {
                description: 'Player model count',
                content: { 'application/json': { schema: CountSchema } },
            },
        },
    })
    async count(@param.where(Player) where?: Where<Player>): Promise<ICommonHttpResponse<Count>> {
        return { data: await this.playerRepository.count(where) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    @get(API_ENDPOINTS.PLAYERS.CRUD, {
        responses: {
            '200': {
                description: 'Array of Player model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(Player, { includeRelations: true }),
                        },
                    },
                },
            },
        },
    })
    async find(@param.filter(Player) filter?: Filter<Player>): Promise<ICommonHttpResponse<Player[]>> {
        return { data: await this.playerRepository.find(filter) };
    }

    // @authenticate('jwt')
    // @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ALL_PLAYERS)] })
    // @get(API_ENDPOINTS.PLAYERS.GET_REMOTE, {
    //     responses: {
    //         '200': {
    //             description: 'Array of Player model instances',
    //             content: {
    //                 'application/json': {
    //                     schema: {
    //                         type: 'array',
    //                         items: getModelSchemaRef(Player, { includeRelations: true }),
    //                     },
    //                 },
    //             },
    //         },
    //     },
    // })
    // async findRemote(@param.filter(Player) filter?: Filter<Player>): Promise<any | undefined> {
    //     // try {
    //     //     const now = moment().subtract(7, 'days').format(sportApiDateFormat);
    //     //     const res = await this.sportDataService.sportDataClient.NFLv3StatsClient.getPlayerDetailsByAvailablePromise();
    //     //     return res;
    //     // } catch (error) {
    //     //     ErrorHandler.httpError(error);
    //     // }
    // }

    // @patch(API_ENDPOINTS.PLAYERS.CRUD, {
    //     responses: {
    //         '200': {
    //             description: 'Player PATCH success count',
    //             content: { 'application/json': { schema: CountSchema } },
    //         },
    //     },
    // })
    // async updateAll(
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Player, { partial: true }),
    //             },
    //         },
    //     })
    //     player: Player,
    //     @param.where(Player) where?: Where<Player>,
    // ): Promise<Count> {
    //     return this.playerRepository.updateAll(player, where);
    // }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ANY_PLAYER)] })
    @get(API_ENDPOINTS.PLAYERS.BY_ID, {
        responses: {
            '200': {
                description: 'Player model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Player, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.number('id') id: number,
        @param.filter(Player, { exclude: 'where' }) filter?: FilterExcludingWhere<Player>,
    ): Promise<ICommonHttpResponse<Player>> {
        return { data: await this.playerRepository.findById(id, filter) };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ANY_PLAYER)] })
    @get(API_ENDPOINTS.PLAYERS.TOP, {
        responses: {
            '200': {
                description: 'Player model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Player, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findTopPlayers(): Promise<ICommonHttpResponse<any>> {
        const shuffledArray = TOP_PLAYERS.map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value.remoteId);

        let topPlayer = null;

        for (let i = 0; i < shuffledArray.length; i++) {
            if (topPlayer === null) {
                const currentPlayer = shuffledArray[i];
                const foundPlayer = await this.playerRepository.findOne({
                    where: {
                        hasStarted: false,
                        isOver: false,
                        position: { inq: TOP_PLAYER_POSITIONS },
                        remoteId: {
                            inq: [currentPlayer],
                        },
                        available: true,
                        status: 'Active',
                        projectedFantasyPointsHalfPpr: {
                            gt: 2.9,
                        },
                    },
                });

                if (foundPlayer) {
                    topPlayer = foundPlayer;
                }
            }
        }

        if (!topPlayer) {
            topPlayer = await this.playerRepository.findOne({
                where: {
                    hasStarted: false,
                    isOver: false,
                    available: true,
                    status: 'Active',
                    position: { inq: TOP_PLAYER_POSITIONS },
                    projectedFantasyPointsHalfPpr: {
                        gt: 2.9,
                    },
                },
                order: ['projectedFantasyPointsHalfPpr DESC'],
            });
        }

        return {
            data: topPlayer,
        };
    }

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.VIEW_ANY_PLAYER)] })
    @get(API_ENDPOINTS.PLAYERS.RECOMMENDATIONS, {
        responses: {
            '200': {
                description: 'Player model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(Player, { includeRelations: true }),
                    },
                },
            },
        },
    })
    async findRecommendationsById(@param.path.number('id') id: number): Promise<ICommonHttpResponse<any>> {
        const currentPlayer = await this.playerRepository.findById(id);
        const currentPlayerProjectedFantasyPoints = Number(currentPlayer?.projectedFantasyPointsHalfPpr);
        if (!currentPlayer) throw new HttpErrors.BadRequest(PLAYER_MESSAGES.PLAYER_NOT_FOUND);

        let projectedPointsLowerLimit = currentPlayerProjectedFantasyPoints * LOBBY_SPREAD_LOWER_LIMIT;
        if (currentPlayerProjectedFantasyPoints - projectedPointsLowerLimit > 6.5) {
            projectedPointsLowerLimit = currentPlayerProjectedFantasyPoints - 6.5;
        }

        let projectedPointsUpperLimit = currentPlayerProjectedFantasyPoints * LOBBY_SPREAD_UPPER_LIMIT;
        if (projectedPointsUpperLimit - currentPlayerProjectedFantasyPoints > 6.5) {
            projectedPointsUpperLimit = currentPlayerProjectedFantasyPoints + 6.5;
        }

        // Different Position
        const filteredFirstPlayerPosition = TOP_PLAYER_POSITIONS.filter(
            position => position != currentPlayer.position || position != 'K',
        );
        let firstPlayerArray = await this.playerRepository.find({
            where: {
                hasStarted: false,
                isOver: false,
                position: { inq: filteredFirstPlayerPosition },
                id: { nin: [currentPlayer.id] },
                and: [
                    {
                        projectedFantasyPointsHalfPpr: {
                            between: [projectedPointsLowerLimit, projectedPointsUpperLimit],
                        },
                    },
                    { projectedFantasyPointsHalfPpr: { gt: 2.9 } },
                ],
                available: true,
                status: 'Active',
            },
        });
        let firstPlayerRandomIndex = Math.floor(Math.random() * firstPlayerArray.length);

        let firstPlayer = firstPlayerArray[firstPlayerRandomIndex];

        if (!firstPlayer) {
            firstPlayer = await this.fetchRandomPlayer(projectedPointsLowerLimit, projectedPointsUpperLimit, [
                currentPlayer?.id,
            ]);
        }

        // Same Team/Game
        let secondPlayerArray = await this.playerRepository.find({
            where: {
                hasStarted: false,
                isOver: false,
                teamName: currentPlayer?.opponentName,
                position: { inq: PLAYER_POSITIONS },
                id: { nin: [currentPlayer?.id, firstPlayer?.id || 0] },
                and: [
                    {
                        projectedFantasyPointsHalfPpr: {
                            between: [projectedPointsLowerLimit, projectedPointsUpperLimit],
                        },
                    },
                    { projectedFantasyPointsHalfPpr: { gt: 2.9 } },
                ],
                available: true,
                status: 'Active',
            },
        });

        let secondPlayerRandomIndex = Math.floor(Math.random() * secondPlayerArray.length);

        let secondPlayer = secondPlayerArray[secondPlayerRandomIndex];

        if (!secondPlayer) {
            secondPlayer = await this.fetchRandomPlayer(projectedPointsLowerLimit, projectedPointsUpperLimit, [
                currentPlayer?.id,
                firstPlayer?.id || 0,
            ]);
        }

        // Favorite from same position
        let thirdPlayerArray = await this.playerRepository.find({
            where: {
                hasStarted: false,
                isOver: false,
                position: { inq: [currentPlayer?.position] },
                id: { nin: [currentPlayer?.id, firstPlayer?.id || 0, secondPlayer?.id || 0] },
                and: [
                    {
                        projectedFantasyPointsHalfPpr: {
                            between: [currentPlayerProjectedFantasyPoints, projectedPointsUpperLimit],
                        },
                    },
                    { projectedFantasyPointsHalfPpr: { gt: 2.9 } },
                ],
                available: true,
                status: 'Active',
            },
        });

        let thirdPlayerRandomIndex = Math.floor(Math.random() * thirdPlayerArray.length);

        let thirdPlayer = thirdPlayerArray[thirdPlayerRandomIndex];

        if (!thirdPlayer) {
            thirdPlayer = await this.fetchRandomPlayer(projectedPointsLowerLimit, projectedPointsUpperLimit, [
                currentPlayer?.id,
                firstPlayer?.id || 0,
                secondPlayer?.id || 0,
            ]);
        }

        // Underdog from same position
        let fourthPlayerArray = await this.playerRepository.find({
            where: {
                hasStarted: false,
                isOver: false,
                position: { inq: [currentPlayer?.position] },
                id: { nin: [currentPlayer?.id, firstPlayer?.id || 0, secondPlayer?.id || 0, thirdPlayer?.id || 0] },
                and: [
                    {
                        projectedFantasyPointsHalfPpr: {
                            between: [projectedPointsLowerLimit, currentPlayerProjectedFantasyPoints],
                        },
                    },
                    { projectedFantasyPointsHalfPpr: { gt: 2.9 } },
                ],
                available: true,
                status: 'Active',
            },
        });

        let fourthPlayerRandomIndex = Math.floor(Math.random() * fourthPlayerArray.length);

        let fourthPlayer = fourthPlayerArray[fourthPlayerRandomIndex];

        if (!fourthPlayer) {
            fourthPlayer = await this.fetchRandomPlayer(projectedPointsLowerLimit, projectedPointsUpperLimit, [
                currentPlayer?.id,
                firstPlayer?.id || 0,
                secondPlayer?.id || 0,
                thirdPlayer?.id || 0,
            ]);
        }

        // Random from same position
        let fifthPlayerArray = await this.playerRepository.find({
            where: {
                hasStarted: false,
                isOver: false,
                position: { inq: [currentPlayer?.position] },
                id: {
                    nin: [
                        currentPlayer?.id,
                        firstPlayer?.id || 0,
                        secondPlayer?.id || 0,
                        thirdPlayer?.id || 0,
                        fourthPlayer?.id || 0,
                    ],
                },
                and: [
                    {
                        projectedFantasyPointsHalfPpr: {
                            between: [projectedPointsLowerLimit, projectedPointsUpperLimit],
                        },
                    },
                    { projectedFantasyPointsHalfPpr: { gt: 2.9 } },
                ],
                available: true,
                status: 'Active',
            },
        });

        let fifthPlayerRandomIndex = Math.floor(Math.random() * fifthPlayerArray.length);
        
        let fifthPlayer = fifthPlayerArray[fifthPlayerRandomIndex];
        

        if (!fifthPlayer) {
            fifthPlayer = await this.fetchRandomPlayer(projectedPointsLowerLimit, projectedPointsUpperLimit, [
                currentPlayer?.id,
                firstPlayer?.id || 0,
                secondPlayer?.id || 0,
                thirdPlayer?.id || 0,
                fourthPlayer?.id || 0,
            ]);
            
        }

        const recommendations = [firstPlayer, secondPlayer, thirdPlayer, fourthPlayer, fifthPlayer].filter(
            player => player !== null && player !== undefined,
        );

        return {
            data: {
                currentPlayer,
                recommendations: recommendations,
            },
        };
    }

    private async fetchRandomPlayer(
        projectedPointsLowerLimit: number,
        projectedPointsUpperLimit: number,
        playerList: number[],
    ): Promise<any> {
        const currentPlayer = await this.playerRepository.findById(playerList[0]);

        if (!currentPlayer) throw new HttpErrors.BadRequest(PLAYER_MESSAGES.PLAYER_NOT_FOUND);

        // Positioned random player
        let randomPlayerArray = await this.playerRepository.find({
            where: {
                hasStarted: false,
                isOver: false,
                id: { nin: playerList },
                position: currentPlayer?.position,
                and: [
                    {
                        projectedFantasyPointsHalfPpr: {
                            between: [projectedPointsLowerLimit, projectedPointsUpperLimit],
                        },
                    },
                    { projectedFantasyPointsHalfPpr: { gt: 2.9 } },
                ],
                available: true,
                status: 'Active',
            },
        });

        let randomPlayerRandomIndex = Math.floor(Math.random() * randomPlayerArray.length);
        

        let randomPlayer = randomPlayerArray[randomPlayerRandomIndex];
        
        // True random player (any position)
        if (!randomPlayer) {
            randomPlayerArray = await this.playerRepository.find({
                where: {
                    hasStarted: false,
                    isOver: false,
                    id: { nin: playerList },
                    position: { inq: PLAYER_POSITIONS },
                    and: [
                        {
                            projectedFantasyPointsHalfPpr: {
                                between: [projectedPointsLowerLimit, projectedPointsUpperLimit],
                            },
                        },
                        { projectedFantasyPointsHalfPpr: { gt: 2.9 } },
                    ],
                    available: true,
                    status: 'Active',
                },
            });
            
        }

        randomPlayerRandomIndex = Math.floor(Math.random() * randomPlayerArray.length);

        randomPlayer = randomPlayerArray[randomPlayerRandomIndex];
       
        return randomPlayer;
    }

    // @patch(API_ENDPOINTS.PLAYERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Player PATCH success',
    //         },
    //     },
    // })
    // async updateById(
    //     @param.path.number('id') id: number,
    //     @requestBody({
    //         content: {
    //             'application/json': {
    //                 schema: getModelSchemaRef(Player, { partial: true }),
    //             },
    //         },
    //     })
    //     player: Player,
    // ): Promise<void> {
    //     await this.playerRepository.updateById(id, player);
    // }

    // @put(API_ENDPOINTS.PLAYERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Player PUT success',
    //         },
    //     },
    // })
    // async replaceById(@param.path.number('id') id: number, @requestBody() player: Player): Promise<void> {
    //     await this.playerRepository.replaceById(id, player);
    // }

    // @del(API_ENDPOINTS.PLAYERS.BY_ID, {
    //     responses: {
    //         '204': {
    //             description: 'Player DELETE success',
    //         },
    //     },
    // })
    // async deleteById(@param.path.number('id') id: number): Promise<void> {
    //     await this.playerRepository.deleteById(id);
    // }

    private async upsertPlayer(nflPlayer: IImportedPlayer, row: number): Promise<void> {
        const team = await this.teamRepository.findOne({ where: { abbr: nflPlayer.team } });
        if (team) {
            const player = await this.playerRepository.findOne({
                where: {
                    firstName: nflPlayer.name,
                    lastName: nflPlayer.name,
                    position: nflPlayer.position,
                    teamId: team.id,
                },
            });
            if (player) {
                await this.playerRepository.updateById(player.id, {
                    available: true,
                    firstName: nflPlayer.name,
                    lastName: nflPlayer.name,
                    position: nflPlayer.position,
                    teamId: team.id,
                    remoteId: nflPlayer.remoteId,
                    photoUrl: nflPlayer.photoUrl,
                    updatedAt: moment().toDate().toString(),
                });
                console.log(chalk.greenBright(`Player: ${nflPlayer.name} updated for team: ${team.name}`));
            } else {
                await this.playerRepository.create({
                    firstName: nflPlayer.name,
                    lastName: nflPlayer.name,
                    position: nflPlayer.position,
                    teamId: team.id,
                    remoteId: nflPlayer.remoteId,
                    photoUrl: nflPlayer.photoUrl,
                });
                console.log(chalk.greenBright(`Player: ${nflPlayer.name} created for team: ${team.name}`));
            }
        } else throw new Error(`Error at row: ${row}. Invalid team (${nflPlayer.team}) for player ${nflPlayer.name}.`);
    }

    private validPlayer(player: IImportedPlayer): boolean {
        if (
            player.team &&
            player.name &&
            player.remoteId &&
            player.photoUrl &&
            player.position &&
            isNumber(+player.points0) &&
            player.points0 &&
            isNumber(+player.points2) &&
            player.points2 &&
            isNumber(+player.points4) &&
            player.points4 &&
            isNumber(+player.points6) &&
            player.points6 &&
            isNumber(+player.points8) &&
            player.points8 &&
            isNumber(+player.points10) &&
            player.points10 &&
            isNumber(+player.points12) &&
            player.points12 &&
            isNumber(+player.points14) &&
            player.points14 &&
            isNumber(+player.points16) &&
            player.points16 &&
            isNumber(+player.points18) &&
            player.points18 &&
            isNumber(+player.points20) &&
            player.points20 &&
            isNumber(+player.points22) &&
            player.points22 &&
            isNumber(+player.points24) &&
            player.points24 &&
            isNumber(+player.points26) &&
            player.points26 &&
            isNumber(+player.points28) &&
            player.points28 &&
            isNumber(+player.points30) &&
            player.points30 &&
            isNumber(+player.points32) &&
            player.points32 &&
            isNumber(+player.points34) &&
            player.points34 &&
            isNumber(+player.points36) &&
            player.points36 &&
            isNumber(+player.points38) &&
            player.points38 &&
            isNumber(+player.points40) &&
            player.points40 &&
            isNumber(+player.points42) &&
            player.points42 &&
            isNumber(+player.points44) &&
            player.points44 &&
            isNumber(+player.points46) &&
            player.points46 &&
            isNumber(+player.points48) &&
            player.points48 &&
            isNumber(+player.points50) &&
            player.points50
        )
            return true;
        return false;
    }

    private validHeaders(headers: string[]): boolean {
        const defaultHeaders = values(DEFAULT_CSV_FILE_PLAYERS_HEADERS);
        if (isEqual(headers.map(x => x).sort(), defaultHeaders.sort())) return true;
        return false;
    }

    private playersCsvTransformer(player: IRemotePlayer) {
        return {
            name: player.Name || 'N/A',
            points0: 0,
            points2: 0,
            points4: 0,
            points6: 0,
            points8: 0,
            points10: 0,
            points12: 0,
            points14: 0,
            points16: 0,
            points18: 0,
            points20: 0,
            points22: 0,
            points24: 0,
            points26: 0,
            points28: 0,
            points30: 0,
            points32: 0,
            points34: 0,
            points36: 0,
            points38: 0,
            points40: 0,
            points42: 0,
            points44: 0,
            points46: 0,
            points48: 0,
            points50: 0,
            position: player.Position || 'N/A',
            team: player.Team || 'N/A',
            remoteTeamId: player.TeamID || 'N/A',
            remoteId: player.PlayerID || 'N/A',
            photoUrl: player.PhotoUrl || 'N/A',
        };
    }
}
