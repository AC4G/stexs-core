import { NextFunction, Response } from "express";
import { ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from "../../env-config";
import { expressjwt as jwt, Request } from 'express-jwt';
import { errorMessages } from "../services/messageBuilderService";

export function validateAccessToken() {
    return [
        jwt({ 
            secret: ACCESS_TOKEN_SECRET, 
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithms: ['HS256']
        }),
        transformJwtErrorMessages
    ];
}

export function validateRefreshToken() {
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
        transformJwtErrorMessages
    ];
}

function transformJwtErrorMessages(err: any, req: Request, res: Response, next: NextFunction) {
    return res.status(err.status).json(errorMessages([{ 
        code: err.code.toUpperCase(), 
        message: err.message 
    }]));
}
