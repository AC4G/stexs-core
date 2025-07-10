import {
    NextFunction,
    Request,
    Response
} from 'express';
import AppError from '../utils/appError';
import logger from '../logger';
import { message } from '../utils/messageBuilder';
import { extractError } from 'utils-node/logger';
import { INTERNAL_ERROR } from 'utils-node/errors';

export default function errorHandlerMiddleware(): (err: unknown, req: any, res: Response, next: NextFunction) => void {
    return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
    }
}
