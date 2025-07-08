import ip from 'ip';
import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import authRouter from './routes/auth/router';
import storageRouter from './routes/storage/router';
import { ENV, LOG_LEVEL, SERVER_PORT } from '../env-config';
import logger from './logger';
import responseTime from 'response-time';
import { message } from 'utils-node/messageBuilder';
import { ROUTE_NOT_FOUND } from 'utils-node/errors';
import cors from 'cors';
import db from './db';
import { Server } from 'http';
import { initEmailProducer } from './producers/emailProducer';
import { extractError } from 'utils-node/logger';
import cookieParser from 'cookie-parser';

(async () => {
	logger.info('Initializing pulsar producers...')

	try {
		await initEmailProducer();
	} catch (err) {
		logger.error('Failed to initialize email producer', { error: extractError(err) });
		process.exit(1);
	}
})();

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());
app.use(responseTime());

app.use((req, res, next) => {
	logger.debug(`Request Headers: ${JSON.stringify(req.headers)}`);
	logger.debug(`Request Body: ${JSON.stringify(req.body)}`);

	const originalSend = res.send;

	res.send = function (body) {
		logger.debug(`Response Body: ${body}`);

		return originalSend.call(this, body);
	};

	next();
});

app.use((req, res, next) => {
	res.on('finish', () => {
		logger.info(
			`method=${req.method} url=${req.originalUrl} status=${res.statusCode} client_ip=${req.header('x-forwarded-for') || req.ip} server_ip=${ip.address()} duration=${res.get('X-Response-Time')}`,
		);
	});
	next();
});

app.use('/auth', authRouter);
app.use('/storage', storageRouter);

app.use((req, res, next) => {
	logger.debug(`Route not found: ${req.method} ${req.path}`);

	res
		.status(404)
		.json(
			message(
				'Route not found.',
				{},
				[
					{
						info: ROUTE_NOT_FOUND,
						data: {
							method: req.method,
							route: req.path,
						},
					},
				]
			),
		);
	next();
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	logger.error(`Internal Server Error. Error:  ${err.message}`, {
		error: extractError(err)
	});

	res.status(500).json(message('Internal Server Error', {}));

	next();
})

let server: Server;

if (ENV !== 'test') {
	server = app.listen(SERVER_PORT, () => {
		logger.info(`Server started in ${ENV} mode and is listening on port ${SERVER_PORT}. Server IP: ${ip.address()}`, { LOG_LEVEL });
	});
}

const closeServer = async (exitCode: number = 0) => {
	try {
		await db.close();
		
		logger.info('Database pool closed successfully.');
	} catch (e) {
		logger.error(`Error closing database pool: ${e instanceof Error ? e.message : e}`);
	}

	logger.info('Server shutted down.');
	process.exit(0);
}

process.on('uncaughtException', (err) => {
	logger.error(`Uncaught Exception: ${err.message}`, { error: extractError(err) });
	closeServer(1);
});

process.on('unhandledRejection', (err) => {
	logger.error(`Unhandled Rejection: ${err instanceof Error ? err.message : err}`, { error: extractError(err) });
	closeServer(1);
});

process.on('SIGINT', async () => {
	logger.info('Received SIGINT. Shutting down gracefully...');

	if (server) {
		server.close(async () => {
			await closeServer();
		});
	} else {
		await closeServer();
	}
});
  
process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM. Shutting down gracefully...');

	if (server) {
		server.close(async () => {
			await closeServer();
		});
	} else {
		await closeServer();
	}
});

export default app;
