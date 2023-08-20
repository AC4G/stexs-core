import { Response, NextFunction } from 'express';
import { 
    AUDIENCE, 
    ISSUER, 
    REFRESH_TOKEN_SECRET
} from '../../env-config';
import { expressjwt as jwt, Request } from 'express-jwt';
import { errorMessages } from '../services/messageBuilderService';

export function validateJWT() {
    return [
        jwt({ 
            secret: REFRESH_TOKEN_SECRET, 
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithms: ['HS256'],
            getToken: (req: Request) => {
                return req.body.refresh_token || null;
            }
         }),
        function(err: any, req: Request, res: Response, next: NextFunction){
            return res.status(err.status).json(errorMessages([{ 
                code: err.code.toUpperCase(), 
                message: err.message 
            }]));
        }
    ];
}
