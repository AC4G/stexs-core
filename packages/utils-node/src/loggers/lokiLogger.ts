import { createLogger, format, Logger } from 'winston';
import LokiTransport from 'winston-loki';

export function createLokiLogger(
	service: string,
	LOGGER_URL: string,
	LOG_LEVEL: string
): Logger {
	return createLogger({
		level: LOG_LEVEL,
		defaultMeta: {
			service,
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
