import { createLogger, format } from 'winston';
import { LOGGER_URL } from '../../env-config';
import LokiTransport from 'winston-loki';

export const prodLogger = createLogger({
	level: 'info',
	defaultMeta: {
		service: 'auth-api',
	},
	format: format.json(),
	transports: [
		new LokiTransport({
			host: LOGGER_URL,
		}),
	],
	exceptionHandlers: [
		new LokiTransport({
			host: LOGGER_URL,
		}),
	],
	rejectionHandlers: [
		new LokiTransport({
			host: LOGGER_URL,
		}),
	],
});
