import { NextFunction, Response, Request } from 'express';
import {
  ACCESS_TOKEN_SECRET,
  AUDIENCE,
  ISSUER,
  REFRESH_TOKEN_SECRET,
  SIGN_IN_CONFIRM_TOKEN_SECRET,
} from '../../env-config';
import { expressjwt as jwt, Request as JWTRequest } from 'express-jwt';
import { errorMessages } from '../services/messageBuilderService';
import {
  CREDENTIALS_BAD_FORMAT,
  CREDENTIALS_REQUIRED,
  INVALID_GRANT_TYPE,
  INVALID_TOKEN,
} from '../constants/errors';
import { verify } from 'jsonwebtoken';
import logger from '../loggers/logger';

class JWTError extends Error {
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

export function validateAccessToken() {
  return jwt({
    secret: ACCESS_TOKEN_SECRET,
    audience: AUDIENCE,
    issuer: ISSUER,
    algorithms: ['HS256'],
  });
}

export function validateRefreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return jwt({
    secret: REFRESH_TOKEN_SECRET,
    audience: AUDIENCE,
    issuer: ISSUER,
    algorithms: ['HS256'],
    getToken: (req) => req.body.refresh_token,
  })(req, res, next);
}

export function validateSignInConfirmToken() {
  return jwt({
    secret: SIGN_IN_CONFIRM_TOKEN_SECRET,
    audience: AUDIENCE,
    issuer: ISSUER,
    algorithms: ['HS256'],
    getToken: (req) => {
      return req.body.token;
    },
  });
}

export function validateSignInConfirmOrAccessToken(
  req: any,
  res: Response,
  next: NextFunction,
) {
  const token = req.body.token;
  let grantType = null;

  verify(
    token,
    SIGN_IN_CONFIRM_TOKEN_SECRET,
    {
      audience: AUDIENCE,
      issuer: ISSUER,
      algorithms: ['HS256'],
    },
    (e, decoded) => {
      if (e) return;

      if (typeof decoded === 'object' && 'grant_type' in decoded) {
        if (decoded?.grant_type !== 'sign_in_confirm')
          throw new JWTError(
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
    throw new JWTError(CREDENTIALS_REQUIRED, 400);
  }

  const [bearer, accessToken] = authHeader.split(' ');

  if (bearer.toLowerCase() !== 'bearer') {
    throw new JWTError(CREDENTIALS_BAD_FORMAT, 400);
  }

  verify(
    accessToken,
    ACCESS_TOKEN_SECRET,
    {
      audience: AUDIENCE,
      issuer: ISSUER,
      algorithms: ['HS256'],
    },
    (e, decoded) => {
      if (e) return;

      if (typeof decoded === 'object' && 'grant_type' in decoded) {
        if (decoded?.grant_type !== 'sign_in')
          throw new JWTError(
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

  if (grantType === null) throw new JWTError(INVALID_TOKEN, 403);

  return next();
}

export function checkTokenGrantType(grantType: string) {
  return (req: JWTRequest, res: Response, next: NextFunction) => {
    const token = req.auth;

    if (token?.grant_type === grantType) {
      return next();
    }

    throw new JWTError(
      {
        message: INVALID_GRANT_TYPE.messages[0],
        code: INVALID_GRANT_TYPE.code,
      },
      403,
    );
  };
}

export function transformJwtErrorMessages(
  err: JWTError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
}
