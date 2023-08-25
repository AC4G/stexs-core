import { NextFunction, Response } from "express";
import { 
    ACCESS_TOKEN_SECRET, 
    AUDIENCE, 
    ISSUER, 
    REFRESH_TOKEN_SECRET 
} from "../../env-config";
import { expressjwt as jwt, Request } from 'express-jwt';
import { errorMessages } from "../services/messageBuilderService";
import { INVALID_GRANT_TYPE } from "../constants/errors";
import { UnauthorizedError } from "express-jwt";

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

export function checkTokenForSignInGrantType(req: Request, res: Response, next: NextFunction) {
    const token = req.auth;

    if (token?.grant_type === 'sign_in') {
        return next();
    }

    const err = {
        status: 403,
        code: INVALID_GRANT_TYPE.code,
        message: INVALID_GRANT_TYPE.message
    };

    throw new UnauthorizedError('invalid_token', { message: INVALID_GRANT_TYPE.message });
}

export function transformJwtErrorMessages(err: any, req: Request, res: Response, next: NextFunction) {
    return res.status(err.status).json(errorMessages([{ 
        code: err.code.toUpperCase(), 
        message: err.message 
    }]));
}
