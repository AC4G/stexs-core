import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import db from '../database';
import { body } from 'express-validator';
import {
  CODE_EXPIRED,
  CODE_REQUIRED,
  EMAIL_REQUIRED,
  INTERNAL_ERROR,
  INVALID_CODE,
  INVALID_EMAIL,
  INVALID_PASSWORD,
  INVALID_PASSWORD_LENGTH,
  INVALID_TYPE,
  MFA_EMAIL_DISABLED,
  NEW_PASSWORD_EQUALS_CURRENT,
  PASSWORD_CHANGE_FAILED,
  PASSWORD_REQUIRED,
  TOTP_DISABLED,
  TYPE_REQUIRED,
} from 'utils-node/errors';
import {
  CustomValidationError,
  errorMessages,
  message,
} from 'utils-node/messageBuilder';
import sendEmail from '../services/emailService';
import validate from 'utils-node/validatorMiddleware';
import logger from '../loggers/logger';
import { generateCode, isExpired } from 'utils-node';
import {
  validateAccessToken,
  checkTokenGrantType,
  transformJwtErrorMessages,
} from 'utils-node/jwtMiddleware';
import { ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER } from '../../env-config';
import { getTOTPForVerification } from '../services/totpService';

const router = Router();

router.get(
  '/',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password']),
    transformJwtErrorMessages(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;

    try {
      const { rows } = await db.query(
        `
            SELECT 
                id, 
                email, 
                raw_user_meta_data,
                created_at,
                updated_at 
            FROM auth.users
            WHERE id = $1::uuid;
        `,
        [userId],
      );

      logger.info(`User data retrieve successful for user: ${userId}`);

      res.json(rows[0]);
    } catch (e) {
      logger.error(
        `Error while fetching user data for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
  },
);

router.post(
  '/password',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password']),
    transformJwtErrorMessages(logger),
    body('password')
      .notEmpty()
      .withMessage(PASSWORD_REQUIRED)
      .bail()
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.><,?'";:\]{}=+\-_)(*^%$#@!~`])/,
      )
      .withMessage(INVALID_PASSWORD)
      .bail()
      .isLength({ min: 10 })
      .withMessage(INVALID_PASSWORD_LENGTH),
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
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { password, code, type } = req.body;

    try {
      if (type === 'totp') {
        const { rows, rowCount } = await db.query(
          `
              SELECT totp, totp_secret
              FROM auth.mfa
              WHERE user_id = $1::uuid;
          `,
          [userId],
        );

        if (rowCount === 0) {
          logger.error(
            `Failed to fetch MFA totp code and totp_secret for user: ${userId}`,
          );
          return res
            .status(500)
            .json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (!rows[0].totp) {
          logger.warn(`MFA TOTP is disabled for user: ${userId}`);
          return res.status(400).json(errorMessages([{ info: TOTP_DISABLED }]));
        }

        const totp = getTOTPForVerification(rows[0].totp_secret);

        if (totp.validate({ token: code, window: 1 })) {
          logger.warn(
            `Invalid code provided for MFA TOTP password change for user: ${userId}`,
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
      }

      if (type === 'email') {
        const { rows, rowCount } = await db.query(
          `
              SELECT email, email_code, email_code_sent
              FROM auth.mfa
              WHERE user_id = $1::uuid;
          `,
          [userId],
        );

        if (rowCount === 0) {
          logger.error(
            `Failed to fetch MFA email status, code and timestamp for user: ${userId}`,
          );
          return res
            .status(500)
            .json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (!rows[0].email) {
          logger.warn(`MFA email is disabled for user: ${userId}`);
          return res
            .status(400)
            .json(errorMessages([{ info: MFA_EMAIL_DISABLED }]));
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
      }
    } catch (e) {
      logger.error(
        `Error while checking 2FA code for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
      const { rows, rowCount } = await db.query(
        `
            SELECT 
                CASE 
                    WHEN crypt($1::text, encrypted_password) = encrypted_password 
                    THEN true 
                    ELSE false 
                END AS is_current_password
            FROM auth.users
            WHERE id = $2::uuid;
        `,
        [password, userId],
      );

      if (rowCount === 0) {
        logger.error(`Password change failed for user: ${userId}`);
        return res
          .status(500)
          .json(errorMessages([{ info: PASSWORD_CHANGE_FAILED }]));
      }

      const isCurrentPassword = rows[0].is_current_password;

      if (isCurrentPassword) {
        logger.warn(
          `New password matches the current password for user: ${userId}`,
        );
        return res.status(400).json(
          errorMessages([
            {
              info: NEW_PASSWORD_EQUALS_CURRENT,
              data: {
                path: 'password',
                location: 'body',
              },
            },
          ]),
        );
      }

      const { rowCount: count } = await db.query(
        `
            UPDATE auth.users
            SET
                encrypted_password = crypt($1::text, gen_salt('bf'))
            WHERE id = $2::uuid;
        `,
        [password, userId],
      );

      if (count === 0) {
        logger.error(`Password change failed for user: ${userId}`);
        return res
          .status(500)
          .json(errorMessages([{ info: PASSWORD_CHANGE_FAILED }]));
      }

      logger.info(`Password change successful for user: ${userId}`);

      res.json(message('Password changed successfully.'));
    } catch (e) {
      logger.error(
        `Error while changing password for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
  },
);

router.post(
  '/email',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password']),
    transformJwtErrorMessages(logger),
    body('email')
      .notEmpty()
      .withMessage(EMAIL_REQUIRED)
      .bail()
      .isEmail()
      .withMessage({
        code: INVALID_EMAIL.code,
        message: INVALID_EMAIL.messages[0],
      }),
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
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { email: newEmail, code, type } = req.body;

    try {
      if (type === 'totp') {
        const { rows, rowCount } = await db.query(
          `
              SELECT totp, totp_secret
              FROM auth.mfa
              WHERE user_id = $1::uuid;
          `,
          [userId],
        );

        if (rowCount === 0) {
          logger.error(
            `Failed to fetch MFA totp code and totp_secret for user: ${userId}`,
          );
          return res
            .status(500)
            .json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (!rows[0].totp) {
          logger.warn(`MFA TOTP is disabled for user: ${userId}`);
          return res.status(400).json(errorMessages([{ info: TOTP_DISABLED }]));
        }

        const totp = getTOTPForVerification(rows[0].totp_secret);

        if (totp.validate({ token: code, window: 1 })) {
          logger.warn(
            `Invalid code provided for MFA TOTP password change for user: ${userId}`,
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
      }

      if (type === 'email') {
        const { rows, rowCount } = await db.query(
          `
              SELECT email, email_code, email_code_sent
              FROM auth.mfa
              WHERE user_id = $1::uuid;
          `,
          [userId],
        );

        if (rowCount === 0) {
          logger.error(
            `Failed to fetch MFA email status, code and timestamp for user: ${userId}`,
          );
          return res
            .status(500)
            .json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (!rows[0].email) {
          logger.warn(`MFA email is disabled for user: ${userId}`);
          return res
            .status(400)
            .json(errorMessages([{ info: MFA_EMAIL_DISABLED }]));
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
      }
    } catch (e) {
      logger.error(
        `Error while checking 2FA code for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const confirmationCode = generateCode(8);

    try {
      const { rowCount } = await db.query(
        `
            UPDATE auth.users
            SET 
                email_change = $1::text,
                email_change_sent_at = CURRENT_TIMESTAMP,
                email_change_code = $2::uuid
            WHERE id = $3::uuid;
        `,
        [newEmail, confirmationCode, userId],
      );

      if (rowCount === 0) {
        logger.error(`Email change failed for user: ${userId}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      logger.info(`Email change initiated for user: ${userId}`);
    } catch (e) {
      logger.error(
        `Error during email change initiation for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );

      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
      await sendEmail(
        newEmail,
        'Email Change Verification',
        undefined,
        `Please verify your email change by using the following code: ${confirmationCode}`,
      );
    } catch (e) {
      logger.error(
        `Error sending email change verification link to email: ${newEmail}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Email change verification link sent to ${newEmail}`);

    res.json(
      message(
        'Email change verification link has been sent to the new email address.',
      ),
    );
  },
);

router.post(
  '/email/verify',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password']),
    transformJwtErrorMessages(logger),
    body('code').notEmpty().withMessage(CODE_REQUIRED),
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { code } = req.body;

    try {
      const { rowCount, rows } = await db.query(
        `
            SELECT email_change_sent_at 
            FROM auth.users
            WHERE id = $1::uuid AND email_change_code = $2::text
        `,
        [userId, code],
      );

      if (rowCount === 0) {
        logger.warn(`Invalid email verification code for user: ${userId}`);
        return res.status(400).json(errorMessages([{ info: INVALID_CODE }]));
      }

      if (isExpired(rows[0].email_change_sent_at, 60)) {
        logger.warn(`Email change code expired for user: ${userId}`);
        return res.status(403).json(errorMessages([{ info: CODE_EXPIRED }]));
      }

      const { rowCount: count } = await db.query(
        `
            UPDATE auth.users
            SET
                email = email_change,
                email_verified_at = CURRENT_TIMESTAMP,
                email_change = NULL,
                email_change_sent_at = NULL,
                email_change_code = NULL
            WHERE id = $1::uuid AND email_change_code = $2::text;
        `,
        [userId, code],
      );

      if (count === 0) {
        logger.error(`Email verification failed for user: ${userId}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
    } catch (e) {
      logger.error(
        `Error during email verification for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Email successfully verified and changed for user: ${userId}`);

    res.json(message('Email successfully changed.'));
  },
);

export default router;
