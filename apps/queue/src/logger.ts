import {
    ENV,
    LOG_LEVEL,
    LOGGER,
    LOGGER_URL
} from '../env-config';
import { createLogger } from 'utils-node/logger';
import { Logger } from 'winston';

const logger: Logger = createLogger({
    service: 'QUEUE',
    logger: LOGGER,
    logLevel: LOG_LEVEL,
    loggerUrl: LOGGER_URL,
    env: ENV
});

export default logger;
