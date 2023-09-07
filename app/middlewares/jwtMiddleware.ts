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
import { INVALID_GRANT_TYPE, INVALID_TOKEN } from '../constants/errors';
import { UnauthorizedError } from 'express-jwt';
import { verify } from 'jsonwebtoken'; 

export function validateAccessToken() {
    return jwt({ 
        secret: ACCESS_TOKEN_SECRET, 
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithms: ['HS256']
    });
}

export function validateRefreshToken() { 
    return jwt({ 
        secret: REFRESH_TOKEN_SECRET, 
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithms: ['HS256'],
        getToken: (req: Request) => {
            return req.body.refresh_token || null;
        }
    });
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
            if (decoded?.grant_type !== grantType) throw new Error(INVALID_GRANT_TYPE.code + ': ' + INVALID_GRANT_TYPE.messages[0]);
        }

        req.auth = decoded;
    });
}

export function checkTokenForSignInGrantType(req: JWTRequest, res: Response, next: NextFunction) {
    const token = req.auth;

    if (token?.grant_type === 'sign_in') {
        return next();
    }

    const err = {
        status: 403,
        code: INVALID_GRANT_TYPE.code,
        message: INVALID_GRANT_TYPE.messages[0]
    };

    throw new UnauthorizedError('invalid_token', { message: INVALID_GRANT_TYPE.messages[0] });
}

export function transformJwtErrorMessages(err: any, req: Request, res: Response, next: NextFunction) {
    return res.status(err.status).json(errorMessages([{ 
        code: err.code.toUpperCase(), 
        message: err.message 
    }]));
}
