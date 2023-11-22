import { Router, Request, Response } from 'express';
import { Request as JWTRequest } from 'express-jwt';
import db from '../database';
import { body } from 'express-validator';
import generateAccessToken, {
  generateSignInConfirmToken,
} from '../services/jwtService';
import { CustomValidationError, errorMessages } from 'utils-ts/messageBuilder';
import {
  CODE_EXPIRED,
  CODE_REQUIRED,
  EMAIL_NOT_VERIFIED,
  IDENTIFIER_REQUIRED,
  INTERNAL_ERROR,
  INVALID_CODE,
  INVALID_CREDENTIALS,
  INVALID_TYPE,
  PASSWORD_REQUIRED,
  TOKEN_REQUIRED,
  TYPE_REQUIRED,
  UNSUPPORTED_TYPE,
} from 'utils-ts/errors';
import validate from 'utils-ts/validatorMiddleware';
import logger from '../loggers/logger';
import { isExpired } from 'utils-ts';
import { getTOTPForVerification } from '../services/totpService';
import {
  validateSignInConfirmToken,
  checkTokenGrantType,
  transformJwtErrorMessages,
} from 'utils-ts/jwtMiddleware';
import {
  AUDIENCE,
  ISSUER,
  SIGN_IN_CONFIRM_TOKEN_SECRET,
} from '../../env-config';

const router = Router();

router.post(
  '/',
  [
    body('identifier').notEmpty().withMessage(IDENTIFIER_REQUIRED),
    body('password').notEmpty().withMessage(PASSWORD_REQUIRED),
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    let uuid;
    let types;

    try {
      const { rowCount, rows } = await db.query(
        `
            SELECT u.id, u.email_verified_at,
                    ARRAY_REMOVE(ARRAY[
                            CASE WHEN mfa.email = TRUE THEN 'email' END,
                            CASE WHEN mfa.totp = TRUE THEN 'totp' END
                    ], NULL) AS types
            FROM auth.users u
            LEFT JOIN public.profiles p ON u.id = p.user_id
            LEFT JOIN auth.mfa ON u.id = mfa.user_id
            WHERE u.encrypted_password = crypt($2::text, u.encrypted_password)
            AND (
                (CASE WHEN $1::text ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN u.email ELSE p.username END) ILIKE $1::text
            );
        `,
        [identifier, password],
      );

      if (rowCount === 0) {
        logger.warn(`Invalid credentials for sign in for user: ${identifier}`);
        return res.status(400).json(
          errorMessages([
            {
              info: {
                code: INVALID_CREDENTIALS.code,
                message: INVALID_CREDENTIALS.messages[0],
              },
              data: {
                location: 'body',
                paths: ['identifier', 'password'],
              },
            },
          ]),
        );
      }

      if (!rows[0].email_verified_at) {
        logger.warn(`Email not verified for user: ${identifier}`);
        return res
          .status(400)
          .json(errorMessages([{ info: EMAIL_NOT_VERIFIED }]));
      }

      uuid = rows[0].id;
      types = rows[0].types;
    } catch (e) {
      logger.error(
        `Error during sign in for user: ${identifier}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    if (types.length === 0) {
      try {
        const body = await generateAccessToken({
          sub: uuid,
        });

        logger.info(`New access token generated for user: ${uuid}`);

        res.json(body);
      } catch (e) {
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      logger.info(`Sign-in successful for user: ${uuid}`);

      return;
    }

    const { token, expires } = generateSignInConfirmToken(uuid, types);

    logger.info(`Sign-in initialized for user: ${identifier}`);

    res.json({
      token,
      types,
      expires,
    });
  },
);

router.post(
  '/confirm',
  [
    body('code').notEmpty().withMessage(CODE_REQUIRED),
    body('type')
      .notEmpty()
      .withMessage(TYPE_REQUIRED)
      .bail()
      .custom((value) => {
        const supportedTypes = ['totp', 'email'];

        if (!supportedTypes.includes(value))
          throw new CustomValidationError(INVALID_TYPE);

        return true;
      }),
    body('token').notEmpty().withMessage(TOKEN_REQUIRED),
    validate(logger),
    validateSignInConfirmToken(SIGN_IN_CONFIRM_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType('sign_in_confirm'),
    transformJwtErrorMessages(logger),
  ],
  async (req: JWTRequest, res: Response) => {
    const userId = req.auth?.sub;
    const supportedTypes = req.auth?.types;
    const { type, code } = req.body;

    if (!supportedTypes.includes(type)) {
      logger.warn(`Unsupported MFA type provided for user: ${userId}`);
      return res.status(400).json(
        errorMessages([
          {
            info: UNSUPPORTED_TYPE,
            data: {
              location: 'body',
              path: 'token',
            },
          },
        ]),
      );
    }

    if (type === 'email') {
      try {
        const { rowCount, rows } = await db.query(
          `
                SELECT email_code, email_code_sent_at
                FROM auth.mfa
                WHERE user_id = $1::uuid;
            `,
          [userId],
        );

        if (rowCount === 0) {
          logger.error(
            `Failed to fetch MFA email code and timestamp for user: ${userId}`,
          );
          return res
            .status(500)
            .json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (code !== rows[0].email_code) {
          logger.warn(`Invalid MFA code provided for user: ${userId}`);
          return res.status(403).json(
            errorMessages([
              {
                info: INVALID_CODE,
                data: {
                  location: 'body',
                  path: 'code',
                },
              },
            ]),
          );
        }

        if (isExpired(rows[0].email_code_sent_at, 5)) {
          logger.warn(`MFA code expired for user: ${userId}`);
          return res.status(403).json(
            errorMessages([
              {
                info: CODE_EXPIRED,
                data: {
                  location: 'body',
                  path: 'code',
                },
              },
            ]),
          );
        }

        logger.info(
          `Sign in confirmation successful with MFA email for user: ${userId}`,
        );

        const { rowCount: count } = await db.query(
          `
                UPDATE auth.mfa
                SET
                    email_code = NULL,
                    email_code_sent_at = NULL
                WHERE user_id = $1::uuid;
            `,
          [userId],
        );

        if (count === 0)
          logger.error(`No rows updated in MFA code reset for user: ${userId}`);
      } catch (e) {
        logger.error(
          `Error during MFA email confirmation for user: ${userId}. Error: ${
            e instanceof Error ? e.message : e
          }`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
    }

    if (type === 'totp') {
      try {
        const { rowCount, rows } = await db.query(
          `
                SELECT totp_secret 
                FROM auth.mfa
                WHERE user_id = $1::uuid;
            `,
          [userId],
        );

        if (rowCount === 0) {
          logger.error(`Failed to fetch MFA TOTP secret for user: ${userId}`);
          return res
            .status(500)
            .json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        const totp = getTOTPForVerification(rows[0].totp_secret);

        if (totp.validate({ token: code, window: 1 })) {
          logger.warn(
            `Invalid code provided for MFA TOTP confirmation for user: ${userId}`,
          );
          return res.status(403).json(
            errorMessages([
              {
                info: INVALID_CODE,
                data: {
                  location: 'body',
                  path: 'code',
                },
              },
            ]),
          );
        }

        logger.info(
          `Sign in confirmation successful with MFA TOTP for user: ${userId}`,
        );
      } catch (e) {
        logger.error(
          `Error during MFA TOTP confirmation for user: ${userId}. Error: ${
            e instanceof Error ? e.message : e
          }`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
    }

    try {
      const body = await generateAccessToken({
        sub: userId,
      });

      res.json(body);

      logger.info(`New access token generated for user: ${userId}`);
    } catch (e) {
      res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Sign-in successful for user: ${userId}`);
  },
);

export default router;
