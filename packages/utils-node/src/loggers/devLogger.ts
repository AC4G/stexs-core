import {
	transports,
	createLogger,
	format,
	Logger
} from 'winston';

/*************  ✨ Codeium Command ⭐  *************/
/******  efe8f6ee-fd15-44a7-8862-b9ef5dc6eb1a  *******/
export function createDevLogger(): Logger {
	return createLogger({
		level: 'debug',
		defaultMeta: {
			service: 'api',
		},
		format: format.combine(
			format.colorize(),
			format.timestamp(),
			format.printf(({ level, message, timestamp }) => {
				return `${timestamp} [${level}]: ${message}`;
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
