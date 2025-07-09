import { Router } from 'express';
import { Request } from 'express-jwt';
import { body } from 'express-validator';
import {
	CODE_EXPIRED,
	CODE_FORMAT_INVALID_EMAIL,
	CODE_LENGTH_MISMATCH,
	CODE_REQUIRED,
	EMAIL_NOT_AVAILABLE,
	INTERNAL_ERROR,
	INVALID_CODE,
	NEW_PASSWORD_EQUALS_CURRENT,
	PASSWORD_CHANGE_FAILED,
	USER_NOT_FOUND,
} from 'utils-node/errors';
import { message } from 'utils-node/messageBuilder';
import { sendEmailMessage } from '../../producers/emailProducer';
import logger from '../../logger';
import { generateCode, isExpired } from 'utils-node';
import {
	validate,
	validateAccessToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/middlewares';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	EMAIL_CHANGE_CODE_EXPIRATION,
	ISSUER
} from '../../../env-config';
import { mfaValidationMiddleware } from '../../utils/mfa';
import {
	changePassword,
	getUsersEncryptedPassword,
	finalizeEmailChange,
	getUserData,
	initalizeEmailChange,
	userExistsByEmail,
	validateEmailChange
} from '../../repositories/auth/users';
import { getActiveUserSessions } from '../../repositories/auth/refreshTokens';
import { verifyPassword } from '../../utils/password';
import db from '../../db';
import AppError from '../../utils/appError';
import { alphaNumericRegex } from '../../utils/regex';
import {
	codeSupportedMFABodyValidator,
	emailBodyValidator,
	passwordBodyValidator,
	typeSupportedMFABodyValidator
} from '../../utils/validators';
import asyncHandler from '../../utils/asyncHandler';

const router = Router();

router.get(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;

		const { rowCount, rows } = await getUserData(userId);

		if (!rowCount) {
			throw new AppError({
				status: 404,
				message: 'User not found.',
				errors: [{ info: USER_NOT_FOUND }],
				log: {
					level: 'error',
					message: 'User not found',
					meta: { userId }
				}
			});
		}

		const data = rows[0];

		logger.debug('User data retrieved successfully', {
			userId,
			data
		});

		return message('User data retrieved successfully.', data);
	}),
);

router.get(
	'/sessions',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;

		const { rowCount: amount } = await getActiveUserSessions(userId);

		logger.debug('Sessions amount retrieved successfully', {
			userId,
			amount
		});

		return message('Sessions amount retrieved successfully.', { amount });
	}),
);

router.post(
	'/password',
	[
		passwordBodyValidator(),
		typeSupportedMFABodyValidator(),
		codeSupportedMFABodyValidator(),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
		mfaValidationMiddleware(),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;
		const password: string = req.body.password;

		const { rowCount, rows } = await getUsersEncryptedPassword(userId);

		if (!rowCount) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occurred while changing password.',
				errors: [{ info: PASSWORD_CHANGE_FAILED }],
				log: {
					level: 'error',
					message: 'Password change failed',
					meta: { userId }
				}
			});
		}

		if (await verifyPassword(password, rows[0].encrypted_password)) {
			throw new AppError({
				status: 400,
				message: 'New password matches the current password.',
				errors: [
					{
						info: NEW_PASSWORD_EQUALS_CURRENT,
						data: {
							path: 'password',
							location: 'body',
						},
					},
				],
				log: {
					level: 'debug',
					message: 'New password matches the current password',
					meta: { userId }
				}
			});
		}
		const { rowCount: rowCount2 } = await changePassword(userId, password);

		if (!rowCount2) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occurred while changing password.',
				errors: [{ info: PASSWORD_CHANGE_FAILED }],
				log: {
					level: 'error',
					message: 'Password change failed',
					meta: { userId }
				}
			});
		}

		logger.debug('Password changed successfully', { userId });

		return message('Password changed successfully.');
	}),
);

router.post(
	'/email',
	[
		emailBodyValidator(),
		typeSupportedMFABodyValidator(),
		codeSupportedMFABodyValidator(),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
		mfaValidationMiddleware(),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;
		const newEmail: string = req.body.email;

		const { rowCount } = await userExistsByEmail(newEmail);

		if (rowCount && rowCount > 0) {
			throw new AppError({
				status: 403,
				message: 'Provided email is not available for use.',
				errors: [{ info: EMAIL_NOT_AVAILABLE }],
				log: {
					level: 'debug',
					message: 'Provided email for change is already in use',
					meta: { userId }
				}
			});
		}

		return db.withTransaction(async (client) => {
			const confirmationCode = generateCode(8);

			const { rowCount } = await initalizeEmailChange(
				userId,
				newEmail,
				confirmationCode,
				client
			);

			if (!rowCount) {
				throw new AppError({
					status: 500,
					message: 'An unexpected error occurred while changing email.',
					errors: [{ info: INTERNAL_ERROR }],
					log: {
						level: 'error',
						message: 'Email change failed',
						meta: { userId }
					}
				});
			}

			logger.debug('Email change initialized successfully', {
				userId,
				newEmail
			});

			await sendEmailMessage({
				to: newEmail,
				subject: 'Email Change Verification',
				content: `Please verify your email change by using the following code: ${confirmationCode}`,
			});

			logger.debug('Email change verification link has been sent to the new email address', {
				userId,
				newEmail
			});

			return message('Email change verification link has been sent to the new email address.');
		});
	}),
);

router.post(
	'/email/verify',
	[
		body('code')
			.exists().withMessage(CODE_REQUIRED)
			.isLength({ min: 8, max: 8 }).withMessage(CODE_LENGTH_MISMATCH)
			.matches(alphaNumericRegex).withMessage(CODE_FORMAT_INVALID_EMAIL),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;
		const code: string = req.body.code;

		const { rowCount, rows } = await validateEmailChange(userId, code);

		if (!rowCount) {
			throw new AppError({
				status: 400,
				message: 'Invalid email verification code.',
				errors: [{ info: INVALID_CODE }],
				log: {
					level: 'debug',
					message: 'Invalid email verification code',
					meta: { userId }
				}
			});
		}

		const emailChangeSentAt = rows[0].email_change_sent_at;

		if (!emailChangeSentAt || isExpired(emailChangeSentAt, EMAIL_CHANGE_CODE_EXPIRATION)) {
			throw new AppError({
				status: 403,
				message: 'Email change code has expired.',
				errors: [{ info: CODE_EXPIRED }],
				log: {
					level: 'debug',
					message: 'Email change code expired',
					meta: { userId }
				}
			});
		}

		const { rowCount: rowCount2 } = await finalizeEmailChange(userId);

		if (!rowCount2) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occurred while verifying the new email.',
				errors: [{ info: INTERNAL_ERROR }],
				log: {
					level: 'error',
					message: 'Email verification failed',
					meta: { userId }
				}
			});
		}

		logger.debug('Email successfully changed', { userId });

		return message('Email successfully changed.');
	}),
);

export default router;
