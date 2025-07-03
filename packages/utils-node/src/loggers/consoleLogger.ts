import {
	transports,
	createLogger,
	format,
	Logger
} from 'winston';

export function createConsoleLogger(service: string, LOG_LEVEL: string): Logger {
	return createLogger({
		level: LOG_LEVEL,
		defaultMeta: {
			service,
		},
		format: format.combine(
			format.colorize(),
			format.timestamp(),
			format.printf(({ level, message, timestamp, ...meta }) => {
				const baseMsg = typeof message === 'string' ? message : JSON.stringify(message);
				const metaMsg = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
				return `${timestamp} [${level}]: ${baseMsg}${metaMsg}`;
			}),
		),
		transports: [
			new transports.Console(),
			new transports.File({ filename: './logs/combined.log' }),
		],
		exceptionHandlers: [
			new transports.Console(),
			new transports.File({ filename: './logs/exceptions.log' }),
		],
		rejectionHandlers: [
			new transports.Console(),
			new transports.File({ filename: './logs/rejections.log' }),
		],
	});
}
