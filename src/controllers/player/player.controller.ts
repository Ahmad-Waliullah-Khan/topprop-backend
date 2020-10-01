import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { service } from '@loopback/core';
import { Count, CountSchema, Filter, FilterExcludingWhere, repository, Where } from '@loopback/repository';
import { get, getModelSchemaRef, HttpErrors, param, post, Request, requestBody } from '@loopback/rest';
import { Player } from '@src/models';
import { PlayerRepository, TeamRepository } from '@src/repositories';
import { EmailService, MultiPartyFormService } from '@src/services';
import {
    API_ENDPOINTS,
    DEFAULT_CSV_FILE_PLAYERS_HEADERS,
    EMAIL_TEMPLATES,
    FILE_NAMES,
    PERMISSIONS,
} from '@src/utils/constants';
import { ErrorHandler } from '@src/utils/helpers';
import { AuthorizationHelpers } from '@src/utils/helpers/authorization.helpers';
import { ICommonHttpResponse, IImportedPlayer } from '@src/utils/interfaces';
import { FILE_MESSAGES } from '@src/utils/messages';
import chalk from 'chalk';
import csv from 'csvtojson';
import { createReadStream } from 'fs-extra';
import { isEmpty, isEqual, isNumber, values } from 'lodash';
import moment from 'moment';
export class PlayerController {
    constructor(
        @repository(PlayerRepository)
        private playerRepository: PlayerRepository,
        @repository(TeamRepository) private teamRepository: TeamRepository,
        @service() protected multipartyFormService: MultiPartyFormService,
        @service() private emailService: EmailService,
    ) {}

    @authenticate('jwt')
    @authorize({ voters: [AuthorizationHelpers.allowedByPermission(PERMISSIONS.PLAYERS.IMPORT_PLAYERS)] })
    @post(API_ENDPOINTS.PLAYERS.IMPORT)
    async create(
        @requestBody.file()
        req: Request,
    ): Promise<void> {
        try {
            const { files, fields } = await this.multipartyFormService.getFilesAndFields(req, '25MB');

            // if (isEmpty(fields) || !fields.type) throw new HttpErrors.BadRequest(PLAYER_MESSAGES.PLAYERS_FILE_INVALID_TYPE);

            if (isEmpty(files)) throw new HttpErrors.BadRequest(FILE_MESSAGES.FILE_MISSING);

            const playersFile = files[FILE_NAMES.PLAYERS];
            if (!playersFile) {
                this.multipartyFormService.removeFiles(files);
                throw new HttpErrors.BadRequest(FILE_MESSAGES.FILE_MISSING);
            }

            const allowedContentType = 'text/csv';

            let fileContentType = playersFile.headers['content-type'];

            if (!this.multipartyFormService.isContentType(allowedContentType, fileContentType)) {
                this.multipartyFormService.removeFiles(files);
                throw new HttpErrors.UnsupportedMediaType(FILE_MESSAGES.FILE_INVALID(allowedContentType));
            }

            await this.playerRepository.updateAll({ available: false });
            console.log(`All players unavailable`);
            const errors: string[] = [];
            const promises: Promise<void>[] = [];

            const csvStream = csv().fromStream(createReadStream(playersFile.path));

            csvStream.on('header', (header: string[]) => {
                if (!this.validHeaders(header)) errors.push('Invalid CSV Header');
            });

            csvStream.on('error', error => {
                errors.push(error.message);
            });

            csvStream.on('data', data => {
                if (errors.length) return;

                const stringifiedData = data.toString('utf8');
                const parsedData: IImportedPlayer = JSON.parse(stringifiedData);

                if (!this.validPlayer(parsedData)) errors.push(stringifiedData);
                else promises.push(this.upsertPlayer(parsedData));
            });

            csvStream.on('done', async err => {
                this.multipartyFormService.removeFiles(files);

                if (err) errors.push(err.message);

                if (errors.length) {
                    this.emailService.sendEmail({
                        template: EMAIL_TEMPLATES.ADMIN_IMPORT_DATA_FAILURE,
                        message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
                        locals: {
                            targetResources: 'Players',
                            importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
                            errors,
                        },
                    });
                    return;
                }
                try {
                    await Promise.all(promises);
                    this.emailService.sendEmail({
                        template: EMAIL_TEMPLATES.ADMIN_IMPORT_DATA_SUCCESS,
                        message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
                        locals: {
                            targetResources: 'Players',
                            importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
                        },
                    });
                } catch (error) {
                    errors.push(err.message);
                    console.error(`Error upserting players. Error:`, error);
                    this.emailService.sendEmail({
                        template: EMAIL_TEMPLATES.ADMIN_IMPORT_DATA_FAILURE,
                        message: { to: process.env.SUPPORT_EMAIL_ADDRESS as string },
                        locals: {
                            targetResources: 'Players',
                            importedDateAndTime: moment().format('MM/DD/YYYY @ hh:mm a'),
                            errors,
                        },
                    });
                }
            });
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

    private async upsertPlayer(nflPlayer: IImportedPlayer): Promise<void> {
        const team = await this.teamRepository.findOne({ where: { abbr: nflPlayer.team } });
        if (team) {
            const player = await this.playerRepository.findOne({
                where: { name: nflPlayer.name, position: nflPlayer.position, teamId: team.id },
            });
            if (player) {
                await this.playerRepository.updateById(player.id, {
                    available: true,
                    name: nflPlayer.name,
                    position: nflPlayer.position,
                    teamId: team.id,
                    points0: 100 * +nflPlayer.points0,
                    points2: 100 * +nflPlayer.points2,
                    points4: 100 * +nflPlayer.points4,
                    points6: 100 * +nflPlayer.points6,
                    points8: 100 * +nflPlayer.points8,
                    points10: 100 * +nflPlayer.points10,
                    points12: 100 * +nflPlayer.points12,
                    points14: 100 * +nflPlayer.points14,
                    points16: 100 * +nflPlayer.points16,
                    points18: 100 * +nflPlayer.points18,
                    points20: 100 * +nflPlayer.points20,
                    points22: 100 * +nflPlayer.points22,
                    points24: 100 * +nflPlayer.points24,
                    points26: 100 * +nflPlayer.points26,
                    points28: 100 * +nflPlayer.points28,
                    points30: 100 * +nflPlayer.points30,
                    points32: 100 * +nflPlayer.points32,
                    points34: 100 * +nflPlayer.points34,
                    points36: 100 * +nflPlayer.points36,
                    points38: 100 * +nflPlayer.points38,
                    points40: 100 * +nflPlayer.points40,
                    points42: 100 * +nflPlayer.points42,
                    points44: 100 * +nflPlayer.points44,
                    points46: 100 * +nflPlayer.points46,
                    points48: 100 * +nflPlayer.points48,
                    points50: 100 * +nflPlayer.points50,
                });
                console.log(chalk.greenBright(`Player: ${nflPlayer.name} updated for team: ${team.name}`));
            } else {
                await this.playerRepository.create({
                    name: nflPlayer.name,
                    position: nflPlayer.position,
                    teamId: team.id,
                    points0: 100 * +nflPlayer.points0,
                    points2: 100 * +nflPlayer.points2,
                    points4: 100 * +nflPlayer.points4,
                    points6: 100 * +nflPlayer.points6,
                    points8: 100 * +nflPlayer.points8,
                    points10: 100 * +nflPlayer.points10,
                    points12: 100 * +nflPlayer.points12,
                    points14: 100 * +nflPlayer.points14,
                    points16: 100 * +nflPlayer.points16,
                    points18: 100 * +nflPlayer.points18,
                    points20: 100 * +nflPlayer.points20,
                    points22: 100 * +nflPlayer.points22,
                    points24: 100 * +nflPlayer.points24,
                    points26: 100 * +nflPlayer.points26,
                    points28: 100 * +nflPlayer.points28,
                    points30: 100 * +nflPlayer.points30,
                    points32: 100 * +nflPlayer.points32,
                    points34: 100 * +nflPlayer.points34,
                    points36: 100 * +nflPlayer.points36,
                    points38: 100 * +nflPlayer.points38,
                    points40: 100 * +nflPlayer.points40,
                    points42: 100 * +nflPlayer.points42,
                    points44: 100 * +nflPlayer.points44,
                    points46: 100 * +nflPlayer.points46,
                    points48: 100 * +nflPlayer.points48,
                    points50: 100 * +nflPlayer.points50,
                });
                console.log(chalk.greenBright(`Player: ${nflPlayer.name} created for team: ${team.name}`));
            }
        }
    }

    private validPlayer(player: IImportedPlayer): boolean {
        if (
            player.team &&
            player.name &&
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
        if (
            isEqual(headers.sort(), defaultHeaders.sort())
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.NAME) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.TEAM) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POSITION) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_0) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_2) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_4) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_6) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_8) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_10) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_12) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_14) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_16) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_18) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_20) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_22) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_24) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_26) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_28) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_30) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_32) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_34) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_36) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_38) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_40) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_42) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_44) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_46) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_48) !== -1 &&
            // headers.indexOf(DEFAULT_CSV_FILE_PLAYERS_HEADERS.POINTS_50) !== -1
        )
            return true;
        return false;
    }
}
