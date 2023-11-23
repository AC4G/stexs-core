import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import db from '../database';
import { errorMessages } from 'utils-ts/messageBuilder';
import { INTERNAL_ERROR } from 'utils-ts/errors';
import logger from '../loggers/logger';
import { ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER } from '../../env-config';
import {
  validateAccessToken,
  checkTokenGrantType,
  transformJwtErrorMessages,
} from 'utils-ts/jwtMiddleware';

const router = Router();

router.post(
  '/',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType('password'),
    transformJwtErrorMessages(logger),
  ],
  async (req: Request, res: Response) => {
    const auth = req.auth;

    try {
      const { rowCount } = await db.query(
        `
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1::uuid AND grant_type = 'password' AND session_id = $2::uuid;
        `,
        [auth?.sub, auth?.session_id],
      );

      if (rowCount === 0) {
        logger.warn(
          `Sign-out: No refresh tokens found for user: ${auth?.sub} and session: ${auth?.session_id}`,
        );
        return res.status(404).send();
      }
    } catch (e) {
      logger.error(
        `Error during sign out for user: ${auth?.sub} and session: ${auth?.session_id}. Error:  ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(
      `Sign-out successful for user: ${auth?.sub} from session: ${auth?.session_id}`,
    );

    res.status(204).send();
  },
);

router.post(
  '/everywhere',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType('password'),
    transformJwtErrorMessages(logger),
  ],
  async (req: Request, res: Response) => {
    const sub = req.auth?.sub;

    try {
      const { rowCount } = await db.query(
        `
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1::uuid AND grant_type = 'password';
        `,
        [sub],
      );

      if (rowCount === 0) {
        logger.warn(
          `Sign-out from all sessions: No refresh tokens found for user: ${sub}`,
        );
        return res.status(404).send();
      }
    } catch (e) {
      logger.error(
        `Sign-out from all sessions failed for user: ${sub}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Sign-out from all sessions successful for user: ${sub}`);

    res.status(204).send();
  },
);

export default router;
