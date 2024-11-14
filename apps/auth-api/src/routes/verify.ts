import { Router, Request, Response } from 'express';
import { errorMessages, message } from 'utils-node/messageBuilder';
import db from '../db';
import { body, query } from 'express-validator';
import { ISSUER, REDIRECT_TO_SIGN_IN } from '../../env-config';
import sendEmail from '../services/emailService';
import {
	EMAIL_ALREADY_VERIFIED,
	EMAIL_NOT_FOUND,
	EMAIL_REQUIRED,
	INTERNAL_ERROR,
	INVALID_EMAIL,
	TOKEN_REQUIRED,
} from 'utils-node/errors';
import { v4 as uuidv4 } from 'uuid';
import { validate } from 'utils-node/middlewares';
import logger from '../loggers/logger';
import { isExpired } from 'utils-node';

const router = Router();

router.get(
	'/',
	[
		query('email')
			.notEmpty()
			.withMessage(EMAIL_REQUIRED)
			.bail()
			.isEmail()
			.withMessage({
				code: INVALID_EMAIL.code,
				message: INVALID_EMAIL.messages[0],
			}),
		query('token').notEmpty().withMessage(TOKEN_REQUIRED),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { email, token } = req.query;

		const signInURL = new URL(REDIRECT_TO_SIGN_IN);
		const source = 'verify';

		signInURL.searchParams.set('source', source);

		try {
			const { rowCount, rows: users } = await db.query(
				`
					SELECT 
						id, 
						email_verified_at, 
						verification_sent_at 
					FROM auth.users 
					WHERE email = $1::text 
						AND verification_token = $2::uuid;
				`,
				[email, token],
			);

			if (users[0]?.email_verified_at) {
				signInURL.searchParams.append('code', 'error');
				signInURL.searchParams.append(
					'message',
					'Your email has been already verified.',
				);

				logger.debug(`Email already verified for email: ${email}`);

				return res.redirect(302, signInURL.toString());
			}

			if (rowCount === 0) {
				signInURL.searchParams.append('code', 'error');
				signInURL.searchParams.append(
					'message',
					'Provided verification link is invalid.',
				);

				logger.debug(`Invalid verification link for email: ${email}`);

				return res.redirect(302, signInURL.toString());
			}

			if (isExpired(users[0].verification_sent_at, 60 * 24)) {
				signInURL.searchParams.append('code', 'error');
				signInURL.searchParams.append(
					'message',
					'Verification link expired. Please request a new verification link.',
				);

				logger.debug(`Verification token expired for email: ${email}`);

				return res.redirect(302, signInURL.toString());
			}

			const { rowCount: count } = await db.query(
				`
					UPDATE auth.users
					SET 
						verification_token = NULL,
						verification_sent_at = NULL,
						email_verified_at = CURRENT_TIMESTAMP
					WHERE email = $1::text;
				`,
				[email],
			);

			if (count === 0) {
				logger.error(`User not found for email: ${email}`);
				return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
			}
		} catch (e) {
			logger.error(
				`Error while email verification for email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		logger.debug(`Email successfully verified for email: ${email}`);

		signInURL.searchParams.append('code', 'success');
		signInURL.searchParams.append('message', 'Email successfully verified.');

		res.redirect(302, signInURL.toString());
	},
);

router.post(
	'/resend',
	[
		body('email')
			.notEmpty()
			.withMessage(EMAIL_REQUIRED)
			.bail()
			.isEmail()
			.withMessage({
				code: INVALID_EMAIL.code,
				message: INVALID_EMAIL.messages[0],
			}),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const email = req.body.email;

		try {
			const { rowCount, rows } = await db.query(
				`
					SELECT
						id, 
						email_verified_at 
					FROM auth.users
					WHERE email = $1::text;
				`,
				[email],
			);

			if (rowCount === 0) {
				logger.debug(`Email not found for resend: ${email}`);
				return res.status(404).json(errorMessages([{ info: EMAIL_NOT_FOUND }]));
			}

			if (rows[0].email_confirmed_at) {
				logger.debug(`Email already verified for resend: ${email}`);
				return res
					.status(400)
					.json(errorMessages([{ info: EMAIL_ALREADY_VERIFIED }]));
			}
		} catch (e) {
			logger.error(
				`Error during email lookup for resend with email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		const token = uuidv4();

		try {
			const { rowCount } = await db.query(
				`
					UPDATE auth.users
					SET 
						verification_token = $1::uuid,
						verification_sent_at = CURRENT_TIMESTAMP
					WHERE email = $2::text;
				`,
				[token, email],
			);

			if (rowCount === 0) {
				logger.error(
					`Verification token update failed during resend for email: ${email}`,
				);
				return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
			}
		} catch (e) {
			logger.error(
				`Verification token update failed during resend for email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		try {
			await sendEmail(
				email,
				'Verification Email',
				undefined,
				`Please verify your email. ${
					ISSUER + '/verify?email=' + email + '&token=' + token
				}`,
			);
		} catch (e) {
			logger.error(
				`Error sending verification email to ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		logger.debug(`Verification email resent successful for email: ${email}`);

		res.json(message(`New verification email has been sent to ${email}`));
	},
);

export default router;
