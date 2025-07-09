import ip from 'ip';
import express, {
	NextFunction,
	Request,
	Response
} from 'express';
import bodyParser from 'body-parser';
import authRouter from './routes/auth/router';
import storageRouter from './routes/storage/router';
import { ENV, LOG_LEVEL, SERVER_PORT } from '../env-config';
import logger from './logger';
import responseTime from 'response-time';
import { message } from 'utils-node/messageBuilder';
import { INTERNAL_ERROR, ROUTE_NOT_FOUND } from 'utils-node/errors';
import cors from 'cors';
import db from './db';
import { Server } from 'http';
import { initEmailProducer } from './producers/emailProducer';
import { extractError } from 'utils-node/logger';
import cookieParser from 'cookie-parser';
import AppError from './utils/appError';

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
	logger.debug('Request Headers', { requestHeaders: req.headers });
	logger.debug('Request Body', { requestBody: req.body });

	const originalSend = res.send;

	res.send = function (body) {
		let parsedBody = body;
		
		if (typeof body === 'string') {
			try {
				parsedBody = JSON.parse(body);
			} catch {}
		}

		logger.debug('Response Body', { responseBody: parsedBody });

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
	logger.debug('Route not found', {
		route: req.path,
		method: req.method
	});

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

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
	if (err instanceof AppError) {
		if (err.log) {
			logger[err.log.level](err.log.message, {
				...err.log.meta,
				stack: err.stackTrace || err.stack,
			});
		}

		return res.status(err.status).json(
			message(
				err.message,
				{ ...err.data },
				err.errors
			)
		);
	}

	const isError = err instanceof Error;
	const stack = isError ? err.stack : undefined;
	const errorMessage = isError ? err.message : String(err);

	logger.error('Unhandled error', {
		message: errorMessage,
		stack,
		error: extractError(err),
	});

	return res.status(500).json(
		message('Internal Server Error', {}, [
			{ info: INTERNAL_ERROR }
		])
	);
});

let server: Server;

if (ENV !== 'test') {
	server = app.listen(SERVER_PORT, () => {
		logger.info('API server started', {
			ENV,
			LOG_LEVEL,
			SERVER_PORT,
			SERVER_IP: ip.address(),
		});
	});
}

const closeServer = async (exitCode: number = 0) => {
	try {
		await db.close();
		
		logger.info('Database pool closed successfully.');
	} catch (e) {
		logger.error('Error closing database pool', { error: extractError(e) });
	}

	logger.info('Server shutted down.');
	process.exit(exitCode);
}

process.on('uncaughtException', (err) => {
	logger.error('Uncaught Exception', { error: extractError(err) });
	closeServer(1);
});

process.on('unhandledRejection', (err) => {
	logger.error('Unhandled Rejection', { error: extractError(err) });
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
