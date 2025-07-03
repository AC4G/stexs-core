import { Logger } from 'winston';
import { createConsoleLogger } from './consoleLogger';
import { createLokiLogger } from './lokiLogger';

export function createLogger(service: string, LOGGER: 'console' | 'loki', LOG_LEVEL: string, LOGGER_URL: string | undefined): Logger {
    return LOGGER === 'loki' && LOGGER_URL ? createLokiLogger(service, LOGGER_URL, LOG_LEVEL) : createConsoleLogger(service, LOG_LEVEL);
}
