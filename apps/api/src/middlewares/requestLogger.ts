import ip from 'ip';
import {
    NextFunction,
    Request,
    Response
} from 'express';
import logger from '../logger';

export default function requestLoggerMiddleware(): (req: any, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
        res.on('finish', () => {
            logger.info(
                `method=${req.method} url=${req.originalUrl} status=${res.statusCode} client_ip=${req.header('x-forwarded-for') || req.ip} server_ip=${ip.address()} duration=${res.get('X-Response-Time')}`,
            );
        });
        next();
    }
}
