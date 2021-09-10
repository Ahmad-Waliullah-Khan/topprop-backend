import createHttpError from 'http-errors';
import { isArray, isEmpty, isString } from 'lodash';

export class ErrorHandler {
    static formatError(err: any): string {
        let formattedError = '';

        if (isEmpty(err)) formattedError = 'Something went wrong. Try again.';

        if (isString(err)) formattedError = err;

        if (err && (err.message || err.errmsg)) {
            formattedError = err['errmsg'] || err['message'];
            // formattedError.errorCode = err.code;
            // formattedError.stack = process.env.APP_ENVIRONMENT !== 'production' ? stripAnsi(err.stack) : null;
        }

        if (isArray(err)) formattedError = err.map(err => err.message || err).join(' ');

        //* DWOLLA ERROR FORMATTER
        if (err && err.body && err.body.message) formattedError = err.body.message;

        if (err && err.body && err.body._embedded && err.body._embedded.errors)
            formattedError = err.body._embedded.errors.map((err: any) => err.message).join(' ');

        return formattedError;
    }
    static httpError(error: any) {
        throw createHttpError(error);
    }
}
class FormatedResponseError {
    constructor(public message: string, public error: boolean, public errorCode?: number, public stack?: any) {}
}
