import { Router, Response } from "express";
import { Request } from "express-jwt";
import {
  checkTokenGrantType,
  transformJwtErrorMessages,
  validateAccessToken,
  validateSignInConfirmOrAccessToken,
} from "../middlewares/jwtMiddleware";
import db from "../database";
import generateCode from "../services/codeGeneratorService";
import logger from "../loggers/logger";
import {
  CustomValidationError,
  errorMessages,
  message,
} from "../services/messageBuilderService";
import {
  CODE_EXPIRED,
  CODE_REQUIRED,
  INTERNAL_ERROR,
  INVALID_CODE,
  INVALID_TYPE,
  TOTP_ALREADY_DISABLED,
  TOTP_ALREADY_ENABLED,
  MFA_EMAIL_ALREADY_DISABLED,
  MFA_EMAIL_ALREADY_ENABLED,
  TYPE_REQUIRED,
} from "../constants/errors";
import sendEmail from "../services/emailService";
import { body } from "express-validator";
import validate from "../middlewares/validatorMiddleware";
import { verifyTOTP } from "../controllers/mfaController";
import {
  getTOTPForSettup,
  getTOTPForVerification,
} from "../services/totpService";
import isExpired from "../services/isExpiredService";

const router = Router();

router.get(
  "/",
  [
    validateAccessToken(),
    checkTokenGrantType("sign_in"),
    transformJwtErrorMessages,
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    let flows;

    try {
      const { rowCount, rows } = await db.query(
        `
            SELECT email, totp FROM auth.mfa
            WHERE user_id = $1::uuid;
        `,
        [userId],
      );

      if (rowCount === 0) {
        logger.error(`MFA flows not found for user: ${userId}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      flows = rows[0];
    } catch (e) {
      logger.error(
        `Error while fetching MFA flows for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`MFA flows successfully retrieved for user: ${userId}`);

    res.json(flows);
  },
);

router.post(
  "/totp",
  [
    validateAccessToken(),
    checkTokenGrantType("sign_in"),
    transformJwtErrorMessages,
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    let email;

    try {
      const { rowCount, rows } = await db.query(
        `
            SELECT t.totp, u.email
            FROM auth.mfa AS t
            INNER JOIN auth.users AS u
            ON t.user_id = u.id
            WHERE t.user_id = $1::uuid;
        `,
        [userId],
      );

      if (rowCount === 0) {
        logger.error(`MFA TOTP status not found for user: ${userId}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      if (rows[0].totp) {
        logger.warn(`MFA TOTP is already enabled for user: ${userId}`);
        return res
          .status(400)
          .json(errorMessages([{ info: TOTP_ALREADY_ENABLED }]));
      }

      email = rows[0].email;
    } catch (e) {
      logger.error(
        `Error while fetching MFA TOTP status for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const totp = getTOTPForSettup(email);
    const secret = totp.secret.base32;

    try {
      const { rowCount } = await db.query(
        `
            UPDATE auth.mfa
            SET
                totp_secret = $2::text
            WHERE user_id = $1::uuid;
        `,
        [userId, secret],
      );

      if (rowCount === 0) {
        logger.error(`Failed to set MFA TOTP secret for user: ${userId}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
    } catch (e) {
      logger.error(
        `Error while updating MFA TOTP secret for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const otpAuthUri = totp.toString();

    res.json({
      secret,
      otp_auth_uri: otpAuthUri,
    });
  },
);

router.post(
  "/totp/disable",
  [
    validateAccessToken(),
    checkTokenGrantType("sign_in"),
    transformJwtErrorMessages,
    body("code").notEmpty().withMessage(CODE_REQUIRED),
    validate,
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { code } = req.body;
    let secret;

    try {
      const { rowCount, rows } = await db.query(
        `
            SELECT totp, totp_secret
            FROM auth.mfa
            WHERE user_id = $1::uuid;
        `,
        [userId],
      );

      if (rowCount === 0) {
        logger.error(
          `Failed to fetch MFA TOTP status and secret for user: ${userId}`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      if (!rows[0].totp) {
        logger.warn(`MFA TOTP is already disabled for user: ${userId}`);
        return res
          .status(400)
          .json(errorMessages([{ info: TOTP_ALREADY_DISABLED }]));
      }

      secret = rows[0].totp_secret;
    } catch (e) {
      logger.error(
        `Error while fetching MFA TOTP status and secret for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const totp = getTOTPForVerification(secret);

    if (totp.validate({ token: code, window: 1 }) === null) {
      logger.warn(`Invalid code provided for MFA TOTP for user: ${userId}`);
      return res.status(403).json(
        errorMessages([
          {
            info: INVALID_CODE,
            data: {
              location: "body",
              path: "code",
            },
          },
        ]),
      );
    }

    try {
      const { rowCount } = await db.query(
        `
            UPDATE auth.mfa
            SET
                totp = FALSE,
                totp_secret = NULL,
                totp_verified_at = NULL
            WHERE user_id = $1::uuid;
        `,
        [userId],
      );

      if (rowCount === 0) {
        logger.error(
          `Failed to update MFA TOTP status, secret and timestamp for user: ${userId}`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
    } catch (e) {
      logger.error(
        `Error while updating MFA TOTP status, secret and timestamp for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Successfully disabled MFA TOTP for user: ${userId}`);

    res.json(message("TOTP MFA successfully disabled."));
  },
);

router.post(
  "/email",
  [
    validateAccessToken(),
    checkTokenGrantType("sign_in"),
    transformJwtErrorMessages,
    body("code").notEmpty().withMessage(CODE_REQUIRED),
    validate,
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { code } = req.body;

    try {
      const { rowCount, rows } = await db.query(
        `
            SELECT email, email_code, email_code_sent_at
            FROM auth.mfa
            WHERE user_id = $1::uuid;
        `,
        [userId],
      );

      if (rowCount === 0) {
        logger.error(
          `Failed to fetch MFA email code and timestamp for user: ${userId}`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      if (rows[0].email) {
        logger.warn(`MFA email is already enabled for user: ${userId}`);
        return res
          .status(400)
          .json(errorMessages([{ info: MFA_EMAIL_ALREADY_ENABLED }]));
      }

      if (code !== rows[0].email_code) {
        logger.warn(`Invalid MFA activation code provided for user: ${userId}`);
        return res.status(403).json(
          errorMessages([
            {
              info: INVALID_CODE,
              data: {
                location: "body",
                path: "code",
              },
            },
          ]),
        );
      }

      if (isExpired(rows[0].email_code_sent_at, 5)) {
        logger.warn(`MFA activation code expired for user: ${userId}`);
        return res.status(403).json(
          errorMessages([
            {
              info: CODE_EXPIRED,
              data: {
                location: "body",
                path: "code",
              },
            },
          ]),
        );
      }

      const { rowCount: count } = await db.query(
        `
            UPDATE auth.mfa
            SET
                email = TRUE,
                email_code = NULL,
                email_code_sent_at = NULL
            WHERE user_id = $1::uuid;
        `,
        [userId],
      );

      if (count === 0) {
        logger.error(
          `Failed to update MFA email status, code and timestamp for user: ${userId}`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
    } catch (e) {
      logger.error(
        `Error during MFA email activation for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Successfully enabled MFA email for user: ${userId}`);

    res.json(message("Email MFA successfully enabled."));
  },
);

router.post(
  "/email/disable",
  [
    validateAccessToken(),
    checkTokenGrantType("sign_in"),
    transformJwtErrorMessages,
    body("code").notEmpty().withMessage(CODE_REQUIRED),
    validate,
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { code } = req.body;

    try {
      const { rowCount, rows } = await db.query(
        `
            SELECT email, email_code, email_code_sent_at
            FROM auth.mfa
            WHERE user_id = $1::uuid;
        `,
        [userId],
      );

      if (rowCount === 0) {
        logger.error(
          `Failed to fetch MFA email code and timestamp for user: ${userId}`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      if (!rows[0].email) {
        logger.warn(`MFA email is already disabled for user: ${userId}`);
        return res
          .status(400)
          .json(errorMessages([{ info: MFA_EMAIL_ALREADY_DISABLED }]));
      }

      if (code !== rows[0].email_code) {
        logger.warn(`Invalid MFA code provided for user: ${userId}`);
        return res.status(403).json(
          errorMessages([
            {
              info: INVALID_CODE,
              data: {
                location: "body",
                path: "code",
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
                location: "body",
                path: "code",
              },
            },
          ]),
        );
      }

      const { rowCount: count } = await db.query(
        `
            UPDATE auth.mfa
            SET
                email = FALSE,
                email_code = NULL,
                email_code_sent_at = NULL
            WHERE user_id = $1::uuid;
        `,
        [userId],
      );

      if (count === 0) {
        logger.error(
          `Failed to update MFA email status, code and timestamp for user: ${userId}`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
    } catch (e) {
      logger.error(
        `Error during MFA email confirmation for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Successfully disabled MFA email for user: ${userId}`);

    res.json(message("Email MFA successfully disabled."));
  },
);

router.post(
  "/verify",
  [
    validateAccessToken(),
    checkTokenGrantType("sign_in"),
    transformJwtErrorMessages,
    body("type")
      .notEmpty()
      .withMessage(TYPE_REQUIRED)
      .bail()
      .custom((value) => {
        const supportedTypes = ["totp"];

        if (!supportedTypes.includes(value))
          throw new CustomValidationError(INVALID_TYPE);

        return true;
      }),
    body("code").notEmpty().withMessage(CODE_REQUIRED),
    validate,
  ],
  async (req: Request, res: Response) => {
    const { type } = req.body;

    if (type === "totp") {
      await verifyTOTP(req, res);
    }
  },
);

router.post(
  "/email/send-code",
  [validateSignInConfirmOrAccessToken, transformJwtErrorMessages],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const code = generateCode(8);
    let email;

    try {
      const { rowCount, rows } = await db.query(
        `
            WITH updated_mfa AS (
                UPDATE auth.mfa
                SET
                    email_code = $1::text,
                    email_code_sent_at = CURRENT_TIMESTAMP
                WHERE user_id = $2::uuid
                RETURNING user_id
            )
            SELECT u.email
            FROM auth.users u
            WHERE u.id = $2::uuid;
        `,
        [code, userId],
      );

      if (rowCount === 0) {
        logger.error(`User not found for MFA code update for user: ${userId}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      email = rows[0].email;
    } catch (e) {
      logger.error(
        `Error while updating and fetching MFA code for user: ${userId}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
      await sendEmail(
        email,
        `MFA code ${code}`,
        undefined,
        `Your MFA code: ${code}`,
      );
    } catch (e) {
      logger.error(
        `Error while sending MFA code to ${email}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`MFA code successfully sent to email: ${email}`);

    res.json(message("MFA code successfully send to users email."));
  },
);

export default router;
