import {
    transports,
    createLogger,
    format
} from 'winston';

export const devLogger = createLogger({
    level: 'debug',
    defaultMeta: {
        service: 'auth-api'
    },
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: './logs/combined.log' })
    ]
});
