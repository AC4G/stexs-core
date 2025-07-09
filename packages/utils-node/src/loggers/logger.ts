import { Logger } from 'winston';
import { createConsoleLogger } from './consoleLogger';
import { createLokiLogger } from './lokiLogger';


type LoggerOptions = {
  service: string;
  logger: 'console' | 'loki';
  logLevel: string;
  loggerUrl?: string;
  env: string;
};

export function createLogger(options: LoggerOptions): Logger {
    const {
        service,
        logger,
        logLevel,
        loggerUrl,
        env
    } = options;

    if (logger === 'loki' && loggerUrl) {
        return createLokiLogger(service, loggerUrl, logLevel);
    }

    return createConsoleLogger(service, logLevel, env);
}

export * from './utils';
