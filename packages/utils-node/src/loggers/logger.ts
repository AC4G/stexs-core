import { Logger } from 'winston';
import { createDevLogger } from './devLogger';
import { createProdLogger } from './prodLogger';

export function createLogger(ENV: string, LOGGER_URL: string): Logger {
    return ENV === 'prod' ? createProdLogger(LOGGER_URL) : createDevLogger();
}
