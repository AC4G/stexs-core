import express from 'express';
import bodyParser from 'body-parser';
import signUpRouter from './routes/signUp';
import signInRouter from './routes/signIn';
import signOutRouter from './routes/signOut';
import tokenRouter from './routes/token';
import oauth2Router from './routes/oauth2';
import userRouter from './routes/user';
import recoveryRouter from './routes/recovery';
import verifyRouter from './routes/verify';
import mfaRouter from './routes/mfa';
import swaggerRouter from './routes/swagger';
import { ENV, SERVER_PORT } from '../env-config';
import logger from './loggers/logger';
import responseTime from 'response-time';
import { errorMessages } from './services/messageBuilderService';
import { ROUTE_NOT_FOUND } from './constants/errors';

var cors = require('cors');

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});

const server = express();

server.use(cors({
    origin: 'http://localhost:8080'
}));
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(responseTime());

server.use((req, res, next) => {
    logger.debug(`Request Headers: ${JSON.stringify(req.headers)}`);
    logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
    next();
})

server.use((req, res, next) => {
    res.on('finish', () => {
        logger.info(`method=${req.method} url=${req.originalUrl} status=${res.statusCode} ip=${req.ip} duration=${res.get('X-Response-Time')}`);
    });
    next();
});

server.use('/', swaggerRouter);
server.use('/sign-up', signUpRouter);
server.use('/sign-in', signInRouter);
server.use('/sign-out', signOutRouter);
server.use('/token', tokenRouter);
server.use('/oauth2', oauth2Router);
server.use('/verify', verifyRouter);
server.use('/user', userRouter);
server.use('/recovery', recoveryRouter);
server.use('/mfa', mfaRouter);

server.use((req, res, next) => {
    logger.warn(`Route not found: ${req.method} ${req.path}`);

    res.status(404).json(errorMessages([{
        info: ROUTE_NOT_FOUND,
        data: {
            method: req.method,
            route: req.path
        }
    }]));
    next();
})

if (ENV !== 'test') server.listen(SERVER_PORT, () => {
    logger.info(`Server started in ${ENV} mode and is listening on port ${SERVER_PORT}`);
});

export default server;
