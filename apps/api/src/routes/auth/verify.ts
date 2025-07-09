import { Router, Request } from 'express';
import { message } from 'utils-node/messageBuilder';
import { query } from 'express-validator';
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
	INTERNAL_ERROR,
	INVALID_EMAIL,
	INVALID_UUID,
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
import db from '../../db';
import AppError from '../../utils/appError';
import { emailBodyValidator } from '../../utils/validators';
import asyncHandler from '../../utils/asyncHandler';

const router = Router();

router.get(
	'/',
	[
		query('email')
			.exists().withMessage(EMAIL_REQUIRED)
			.isEmail().withMessage({
				code: INVALID_EMAIL.code,
				message: INVALID_EMAIL.messages[0],
			}),
		query('token')
			.exists().withMessage(TOKEN_REQUIRED)
			.isUUID('4').withMessage(INVALID_UUID),
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const {
			email,
			token
		} = req.query;

		const signInURL = new URL(REDIRECT_TO_SIGN_IN);
		const source = 'verify';

		signInURL.searchParams.set('source', source);

		const { rowCount, rows } = await getEmailVerificationState(email as string, token as string);

		if (!rowCount) {
			signInURL.searchParams.append('code', 'error');
			signInURL.searchParams.append(
				'message',
				'Provided verification link is invalid.',
			);

			logger.debug('Invalid verification link provided', {
				email,
				token
			});

			return { redirect: signInURL.toString() };
		}

		const row = rows[0];

		if (row.email_verified_at) {
			signInURL.searchParams.append('code', 'error');
			signInURL.searchParams.append(
				'message',
				'Your email has been already verified.',
			);

			logger.debug('Email already verified', {
				email,
				token
			});

			return { redirect: signInURL.toString() };
		}

		const verificationSentAt = row.verification_sent_at;

		if (!verificationSentAt || isExpired(verificationSentAt, EMAIL_VERIFICATION_CODE_EXPIRATION)) {
			signInURL.searchParams.append('code', 'error');
			signInURL.searchParams.append(
				'message',
				'Verification link expired. Please request a new verification link.',
			);

			logger.debug('Verification link expired', {
				email,
				token
			});

			return { redirect: signInURL.toString() };
		}

		const { rowCount: count } = await verifyEmail(email as string);

		if (!count) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occurred while verifying email.',
				errors: [{ info: INTERNAL_ERROR }],
				log: {
					level: 'error',
					message: 'Verifying email failed',
					meta: { email },
				}
			});
		}

		logger.debug(`Email successfully verified for email: ${email}`);

		signInURL.searchParams.append('code', 'success');
		signInURL.searchParams.append('message', 'Email successfully verified.');

		return { redirect: signInURL.toString() };
	}),
);

router.post(
	'/resend',
	[
		emailBodyValidator(),
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const email: string = req.body.email;

		const { rowCount, rows } = await getEmailVerifiedStatus(email);

		if (!rowCount) {
			logger.debug('Email not found for resend', { email });

			return [
				404,
				message(
					'Email not found.',
					{},
					[{ info: EMAIL_NOT_FOUND }]
				)
			];
		}

		if (rows[0].email_verified_at) {
			logger.debug('Email already verified for resend', { email });

			return [
				400,
				message(
					'Email already verified.',
					{},
					[{ info: EMAIL_ALREADY_VERIFIED }]
				)
			];
		}

		return db.withTransaction(async (client) => {
			const token = uuidv4();

			const { rowCount } = await updateEmailVerificationToken(
				email,
				token,
				client
			);

			if (!rowCount) {
				throw new AppError({
					status: 500,
					message: 'An unexpected error occurred while updating verification token.',
					errors: [{ info: INTERNAL_ERROR }],
					log: {
						level: 'error',
						message: 'Verification token update failed',
						meta: {
							email,
							token
						}
					},
				});
			}

			await sendEmailMessage({
				to: email,
				subject: 'Email Verification',
				content: `Please verify your email. ${
					ISSUER + '/auth/verify?email=' + email + '&token=' + token
				}`,
			});

			logger.debug('Verification email successfully sent', { email });

			return message('New verification email has been sent');
		});
	}),
);

export default router;
