import { Router, Request, Response } from "express";
import db from "../database";
import sendEmail from "../services/emailService";
import {
  message,
  errorMessages,
  CustomValidationError,
} from "../services/messageBuilderService";
import { body } from "express-validator";
import { ISSUER } from "../../env-config";
import {
  EMAIL_REQUIRED,
  INTERNAL_ERROR,
  INVALID_EMAIL,
  INVALID_INPUT_DATA,
  INVALID_PASSWORD,
  INVALID_PASSWORD_LENGTH,
  INVALID_USERNAME,
  PASSWORD_REQUIRED,
  USERNAME_REQUIRED,
} from "../constants/errors";
import { v4 as uuidv4 } from "uuid";
import validate from "../middlewares/validatorMiddleware";
import logger from "../loggers/logger";

const router = Router();

router.post(
  "/",
  [
    body("username")
      .notEmpty()
      .withMessage(USERNAME_REQUIRED)
      .bail()
      .isLength({ min: 1, max: 20 })
      .withMessage({
        code: INVALID_USERNAME.code,
        message: INVALID_USERNAME.messages[0],
      })
      .custom((value: string) => {
        if (!/^[A-Za-z0-9!@#$%^&*()_+=\-[\]{}|;:'",.<>/?`~\\ ]+$/.test(value))
          throw new CustomValidationError({
            code: INVALID_USERNAME.code,
            message: INVALID_USERNAME.messages[2],
          });

        return true;
      })
      .custom((value: string) => {
        if (/^\w+([-]?\w+)*@\w+([-]?\w+)*(\.\w{2,3})+$/.test(value))
          throw new CustomValidationError({
            code: INVALID_USERNAME.code,
            message: INVALID_USERNAME.messages[1],
          });

        return true;
      }),
    body("email")
      .notEmpty()
      .withMessage(EMAIL_REQUIRED)
      .bail()
      .isEmail()
      .withMessage({
        code: INVALID_EMAIL.code,
        message: INVALID_EMAIL.messages[0],
      }),
    body("password")
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
    validate,
  ],
  async (req: Request, res: Response) => {
    const { username, password, email } = req.body;
    const token = uuidv4();

    try {
      const { rowCount } = await db.query(
        `
            INSERT INTO auth.users (
                email, 
                encrypted_password, 
                raw_user_meta_data,
                verification_token,
                verification_sent_at
            )
            VALUES ($1::text, $2::text, $3::jsonb, $4::uuid, CURRENT_TIMESTAMP)
            RETURNING id;
        `,
        [email, password, { username }, token],
      );

      if (rowCount === 0) {
        logger.error("Sign-up: Database insertion failed.");
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }

      logger.info(`Sign-up successful for user: ${username}`);

      res
        .status(201)
        .json(
          message(
            "Sign-up successful. Check your email for an verification link!",
          ),
        );
    } catch (e) {
      const err = e as { hint: string | null };

      if (err.hint) {
        const path = err.hint.split(" ").pop()!;

        logger.warn(
          `Sign-up validation failed for user: ${username}, path: ${path}`,
        );

        return res.status(400).json(
          errorMessages([
            {
              info: {
                code: INVALID_INPUT_DATA.code,
                message: err.hint + ".",
              },
              data: {
                path,
                location: "body",
              },
            },
          ]),
        );
      }

      logger.error(
        `Error during sign up: ${e instanceof Error ? e.message : e}`,
      );

      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
      await sendEmail(
        email,
        "Verification Email",
        undefined,
        `Please verify your email. ${
          ISSUER + "/verify?email=" + email + "&token=" + token
        }`,
      );
      logger.info(
        `Email verification message sent successfully for user: ${username}`,
      );
    } catch (e) {
      logger.error(
        `Sending verification email failed for email: ${email}. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
  },
);

export default router;
