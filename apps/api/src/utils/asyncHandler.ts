import {
  Request,
  Response,
  NextFunction,
  CookieOptions
} from 'express';
import { ApiResponse } from 'utils-node/messageBuilder';

type Cookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

type FullResponseReturn = {
  status?: number;
  body?: ApiResponse;
  cookies?: Cookie[];
};

type RedirectReturn = {
  redirect: string;
  status?: number;
};

type Status = number;

export type AsyncHandlerResult =
  | Status
  | [Status, ApiResponse]
  | ApiResponse
  | RedirectReturn
  | FullResponseReturn
  | void;

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<AsyncHandlerResult>
) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fn(req, res, next);

    if (res.headersSent || result === undefined) return;

    if (typeof result === 'number') {
      return res.sendStatus(result);
    }

    if (Array.isArray(result) && typeof result[0] === 'number') {
      const [status, body] = result;
      return res.status(status).json(body);
    }

    if (
      typeof result === 'object' &&
      'message' in result &&
      'errors' in result &&
      'data' in result
    ) {
      return res.status(200).json(result);
    }

    if (
      typeof result === 'object' &&
      'redirect' in result &&
      typeof result.redirect === 'string'
    ) {
      return res.redirect(result.status || 302, result.redirect);
    }

    if (typeof result === 'object') {
      const { status = 200, body, cookies } = result as FullResponseReturn;

      cookies?.forEach(({ name, value, options }) => {
        if (options) {
          res.cookie(name, value, options);
        } else {
          res.cookie(name, value);
        }
      });

      if (body) return res.status(status).json(body);

      return res.sendStatus(status);
    }
  } catch (err) {
    next(err);
  }
};

export default asyncHandler;
