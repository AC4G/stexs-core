import { Logger } from 'winston';
import { createDevLogger } from './devLogger';
import { createProdLogger } from './prodLogger';

export function createLogger(ENV: string, LOGGER_URL: string | undefined): Logger {
    return ENV === 'prod' && LOGGER_URL ? createProdLogger(LOGGER_URL) : createDevLogger();
}
