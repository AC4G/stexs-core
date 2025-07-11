import {
    NextFunction,
    Request,
    Response
} from 'express';
import { ROUTE_NOT_FOUND } from 'utils-node/errors';
import AppError from '../utils/appError';

export default function notFoundMiddleware(): (req: any, res: Response, next: NextFunction) => void {
    return (req: Request, _res: Response, _next: NextFunction) => {
        throw new AppError({
            status: 404,
            message: 'Route not found.',
            errors: [{ info: ROUTE_NOT_FOUND }],
            data: {
                method: req.method,
                route: req.path,
            }
        });
    }
}
