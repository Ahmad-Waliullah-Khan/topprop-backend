const path = require('path');
const winston = require('winston');

const isDevelopment = process.env.NODE_ENV !== 'production';

const LOGS_DIR = isDevelopment ? 'logs' : '/var/logs';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'logs' },
    transports: [
        //
        // - Write to all logs with level `info` and below to `info.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({ filename: path.join(LOGS_DIR, 'debug.log'), level: 'debug', timestamp: true }),
        new winston.transports.File({ filename: path.join(LOGS_DIR, 'error.log'), level: 'error', timestamp: true }),
        new winston.transports.File({ filename: path.join(LOGS_DIR, 'info.log') }),
    ],
});

//
// If not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (isDevelopment) {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    );
}

export default logger;
