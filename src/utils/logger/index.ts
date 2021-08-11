const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'cron-service' },
    transports: [
        //
        // - Write to all logs with level `info` and below to `info.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({ filename: 'logs/debug.log', level: 'debug' }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/info.log' })
    ]
});

//
// If not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple(),
    }));
  }

module.exports = logger;
