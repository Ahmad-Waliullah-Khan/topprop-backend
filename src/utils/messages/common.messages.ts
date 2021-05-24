import { MINIMUM_BET_AMOUNT } from '../constants';

export const COMMON_MESSAGES = {
    MISSING_OR_INVALID_BODY_REQUEST: `Must provide a valid body request.`,
    ACCESS_DENIED_ON_RESOURCE: `Access denied. You are not allowed to perform this action on this resource.`,
    INVALID_BET_AMOUNT: `The minimum amount to bet is ${MINIMUM_BET_AMOUNT / 100}`,
    PLAYER_NOT_AVAILABLE: `The given player is not available.`,
};
