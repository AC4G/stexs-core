import { NextFunction, Response, Request } from 'express';
import { expressjwt as jwt, Request as JWTRequest } from 'express-jwt';
import { errorMessages } from '../messageBuilder';
import {
  CREDENTIALS_BAD_FORMAT,
  CREDENTIALS_REQUIRED,
  INVALID_GRANT_TYPE,
  INVALID_TOKEN,
} from '../constants/errors';
import { verify } from 'jsonwebtoken';
import { Logger } from 'winston';

export default class MiddlewareError extends Error {
  code: string;
  status: number;
  data?: Record<string, any>;

  constructor(
    info: { code: string; message: string },
    status: number,
    data?: Record<string, any>,
  ) {
    super(info.message);
    this.code = info.code;
    this.status = status;
    this.data = data;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function validateAccessToken(
  secret: string,
  audience: string,
  issuer: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return jwt({
    secret,
    audience,
    issuer,
    algorithms: ['HS256'],
  });
}

export function validateRefreshToken(
  secret: string,
  audience: string,
  issuer: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return jwt({
    secret,
    audience,
    issuer,
    algorithms: ['HS256'],
    getToken: (req) => req.body.refresh_token,
  });
}

export function validateSignInConfirmToken(
  secret: string,
  audience: string,
  issuer: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return jwt({
    secret,
    audience,
    issuer,
    algorithms: ['HS256'],
    getToken: (req) => {
      return req.body.token;
    },
  });
}

export function validateSignInConfirmOrAccessToken(
  accessSecret: string,
  confirmSecret: string,
  audience: string,
  issuer: string,
): (req: any, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const token = req.body.token;
    let grantType = null;

    verify(
      token,
      confirmSecret,
      {
        audience,
        issuer,
        algorithms: ['HS256'],
      },
      (e, decoded) => {
        if (e?.message === 'jwt expired')
          throw new MiddlewareError(INVALID_TOKEN, 403);

        if (e) return;

        if (typeof decoded === 'object' && 'grant_type' in decoded) {
          if (decoded?.grant_type !== 'sign_in_confirm')
            throw new MiddlewareError(
              {
                message: INVALID_GRANT_TYPE.messages[0],
                code: INVALID_GRANT_TYPE.code,
              },
              403,
            );
        }

        req.auth = decoded;
        grantType = 'sign_in_confirm';
      },
    );

    if (grantType !== null) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new MiddlewareError(CREDENTIALS_REQUIRED, 400);
    }

    const [bearer, accessToken] = authHeader.split(' ');

    if (bearer.toLowerCase() !== 'bearer') {
      throw new MiddlewareError(CREDENTIALS_BAD_FORMAT, 400);
    }

    verify(
      accessToken,
      accessSecret,
      {
        audience,
        issuer,
        algorithms: ['HS256'],
      },
      (e, decoded) => {
        if (e?.message === 'jwt expired')
          throw new MiddlewareError(INVALID_TOKEN, 403);

        if (e) return;

        if (typeof decoded === 'object' && 'grant_type' in decoded) {
          if (decoded?.grant_type !== 'password')
            throw new MiddlewareError(
              {
                message: INVALID_GRANT_TYPE.messages[0],
                code: INVALID_GRANT_TYPE.code,
              },
              403,
            );
        }

        req.auth = decoded;
        grantType = 'access';
      },
    );

    if (grantType === null) throw new MiddlewareError(INVALID_TOKEN, 403);

    return next();
  };
}

export function checkTokenGrantType(grantTypes: string[]) {
  return (req: JWTRequest, res: Response, next: NextFunction) => {
    const token = req.auth;

    if (grantTypes.includes(token?.grant_type)) return next();

    throw new MiddlewareError(
      {
        message: INVALID_GRANT_TYPE.messages[0],
        code: INVALID_GRANT_TYPE.code,
      },
      403,
    );
  };
}

export function transformJwtErrorMessages(logger: Logger) {
  return (
    err: MiddlewareError,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    logger.warn(`JWT Error: ${err.message}`);

    return res.status(err.status).json(
      errorMessages([
        {
          info: {
            code: err.code.toUpperCase(),
            message: err.message,
          },
          data: err.data || {},
        },
      ]),
    );
  };
}
