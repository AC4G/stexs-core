import { 
    NextFunction, 
    Response, 
    Request 
} from 'express';
import { 
    ACCESS_TOKEN_SECRET, 
    AUDIENCE, 
    ISSUER, 
    REFRESH_TOKEN_SECRET 
} from '../../env-config';
import { expressjwt as jwt, Request as JWTRequest } from 'express-jwt';
import { errorMessages } from '../services/messageBuilderService';
import { 
    INVALID_GRANT_TYPE, 
    INVALID_TOKEN, 
    REFRESH_TOKEN_REQUIRED 
} from '../constants/errors';
import { verify } from 'jsonwebtoken'; 
import logger from '../loggers/logger';

class JWTError extends Error {
    code: string;
    status: number;
    data?: Record<string, any>;

    constructor(message: string, code: string, status: number, data?: Record<string, any>) {
        super(message);
        this.code = code;
        this.status = status;
        this.data = data;
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export function validateAccessToken() {
    return jwt({ 
        secret: ACCESS_TOKEN_SECRET, 
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithms: ['HS256']
    });
}

export function validateRefreshToken(req: Request, res: Response, next: NextFunction) { 
    const refreshToken = req.body?.refresh_token;

    if (refreshToken === undefined || refreshToken.length === 0) {
        const err = new JWTError(REFRESH_TOKEN_REQUIRED.message, REFRESH_TOKEN_REQUIRED.code, 400, {
            path: 'refresh_token',
            location: 'body'
        });

        return next(err);
    }

    return jwt({ 
        secret: REFRESH_TOKEN_SECRET, 
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithms: ['HS256'],
        getToken: () => refreshToken
    })(req, res, next);
}

export function isRefreshTokenValid(req: any, grantType: string) {
    const token = req.body.refresh_token;

    verify(token, REFRESH_TOKEN_SECRET, { 
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithms: ['HS256'],
    }, (e, decoded) => {
        if (e) throw new Error(INVALID_TOKEN.code + ': ' + INVALID_TOKEN.message);

        if (typeof decoded === 'object' && 'grant_type' in decoded) {
            if (decoded?.grant_type !== grantType) throw new JWTError(INVALID_GRANT_TYPE.messages[0], INVALID_GRANT_TYPE.code, 403);
        }

        req.auth = decoded;
    });
}

export function checkTokenGrantType(grantType: string) {
    return (req: JWTRequest, res: Response, next: NextFunction) => {
        const token = req.auth;

        if (token?.grant_type === grantType) {
            return next();
        }

        throw new JWTError(INVALID_GRANT_TYPE.messages[0], INVALID_GRANT_TYPE.code, 403);
    };
}

export function transformJwtErrorMessages(err: any, req: Request, res: Response, next: NextFunction) {
    logger.warn(`JWT Error: ${err.message}`);
        
    return res.status(err.status).json(errorMessages([{ 
        info: {
            code: err.code.toUpperCase(), 
            message: err.message
        },
        data: err.data || {}
    }]));
}
