import { Router, Request, Response } from 'express';
import { message } from 'utils-node/messageBuilder';
import { body, query } from 'express-validator';
import {
	EMAIL_VERIFICATION_CODE_EXPIRATION,
	ISSUER,
	REDIRECT_TO_SIGN_IN
} from '../../../env-config';
import { sendEmailMessage } from '../../producers/emailProducer';
import {
	EMAIL_ALREADY_VERIFIED,
	EMAIL_NOT_FOUND,
	EMAIL_REQUIRED,
	FIELD_MUST_BE_A_STRING,
	INTERNAL_ERROR,
	INVALID_EMAIL,
	TOKEN_REQUIRED,
} from 'utils-node/errors';
import { v4 as uuidv4 } from 'uuid';
import { validate } from 'utils-node/middlewares';
import logger from '../../logger';
import { isExpired } from 'utils-node';
import {
	getEmailVerificationState,
	getEmailVerifiedStatus,
	updateEmailVerificationToken,
	verifyEmail
} from '../../repositories/auth/users';

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
		query('token')
			.notEmpty()
			.withMessage(TOKEN_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const {
			email,
			token
		} = req.query;

		const signInURL = new URL(REDIRECT_TO_SIGN_IN);
		const source = 'verify';

		signInURL.searchParams.set('source', source);

		try {
			const { rowCount, rows } = await getEmailVerificationState(email as string, token as string);

			if (!rowCount || rowCount === 0) {
				signInURL.searchParams.append('code', 'error');
				signInURL.searchParams.append(
					'message',
					'Provided verification link is invalid.',
				);

				logger.debug(`Invalid verification link for email: ${email}`);

				return res.redirect(302, signInURL.toString());
			}

			const row = rows[0];

			if (row.email_verified_at) {
				signInURL.searchParams.append('code', 'error');
				signInURL.searchParams.append(
					'message',
					'Your email has been already verified.',
				);

				logger.debug(`Email already verified for email: ${email}`);

				return res.redirect(302, signInURL.toString());
			}

			const verificationSentAt = row.verification_sent_at;

			if (!verificationSentAt || isExpired(verificationSentAt, EMAIL_VERIFICATION_CODE_EXPIRATION)) {
				signInURL.searchParams.append('code', 'error');
				signInURL.searchParams.append(
					'message',
					'Verification link expired. Please request a new verification link.',
				);

				logger.debug(`Verification token expired for email: ${email}`);

				return res.redirect(302, signInURL.toString());
			}

			const { rowCount: count } = await verifyEmail(email as string);

			if (!count || count === 0) {
				logger.error(`Email verification failed for email: ${email}`);
				return res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while verifying email.',
							{},
							[{ info: INTERNAL_ERROR }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while email verification for email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while verifying email.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
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
		const email: string = req.body.email;

		try {
			const { rowCount, rows } = await getEmailVerifiedStatus(email);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Email not found for resend: ${email}`);
				return res
					.status(404)
					.json(
						message(
							'Email not found.',
							{},
							[{ info: EMAIL_NOT_FOUND }]
						)
					);
			}

			if (rows[0].email_verified_at) {
				logger.debug(`Email already verified for resend: ${email}`);
				return res
					.status(400)
					.json(
						message(
							'Email already verified.',
							{},
							[{ info: EMAIL_ALREADY_VERIFIED }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error during email lookup for resend with email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while checking email.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		const token = uuidv4();

		try {
			const { rowCount } = await updateEmailVerificationToken(email, token);

			if (!rowCount || rowCount === 0) {
				logger.error(`Verification token update failed during resend for email: ${email}`);
				return res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while updating verification token.',
							{},
							[{ info: INTERNAL_ERROR }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Verification token update failed during resend for email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while updating verification token.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		try {
			await sendEmailMessage({
				to: email,
				subject: 'Email Verification',
				content: `Please verify your email. ${
					ISSUER + '/auth/verify?email=' + email + '&token=' + token
				}`,
			});
		} catch (e) {
			logger.error(
				`Error sending verification email to ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while sending verification email.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		logger.debug(`Verification email resent successful for email: ${email}`);

		res.json(message(`New verification email has been sent to ${email}`));
	},
);

export default router;
