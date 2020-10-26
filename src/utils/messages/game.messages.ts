import { lowerCase } from 'lodash';

export const GAME_MESSAGES = {
    GAME_NOT_FOUND: `Game does not exist.`,
    INVALID_GAME_STATUS: (currentStatus: string) => `The game is invalid. Current status: ${lowerCase(currentStatus)}.`,
};
