import {
    NextFunction,
    Request,
    Response
} from 'express';
import logger from '../logger';

export default function debugMiddleware(): (req: any, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
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
    }
}
