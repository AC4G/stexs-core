import express from 'express';
import bodyParser from 'body-parser';
import responseTime from 'response-time';
import cors from 'cors';
import logger from './loggers/logger';
import { ENV, SERVER_PORT } from '../env-config';
import { errorMessages } from 'utils-ts/messageBuilder';
import { ROUTE_NOT_FOUND } from 'utils-ts/errors';

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(cors());
server.use(responseTime());

server.use((req, res, next) => {
  logger.debug(`Request Headers: ${JSON.stringify(req.headers)}`);
  logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});

server.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);

  res.status(404).json(
    errorMessages([
      {
        info: ROUTE_NOT_FOUND,
        data: {
          method: req.method,
          route: req.path,
        },
      },
    ]),
  );
  next();
});

server.use((req, res, next) => {
  res.on('finish', () => {
    logger.info(
      `method=${req.method} url=${req.originalUrl} status=${
        res.statusCode
      } ip=${req.ip} duration=${res.get('X-Response-Time')}`,
    );
  });
  next();
});

if (ENV !== 'test')
  server.listen(SERVER_PORT, () => {
    logger.info(
      `Server started in ${ENV} mode and is listening on port ${SERVER_PORT}`,
    );
  });

export default server;
