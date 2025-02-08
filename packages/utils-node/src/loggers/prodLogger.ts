import { createLogger, format, Logger } from 'winston';
import LokiTransport from 'winston-loki';

export function createProdLogger(LOGGER_URL: string): Logger {
	return createLogger({
		level: 'info',
		defaultMeta: {
			service: 'api',
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
}
