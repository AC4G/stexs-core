import { Router, Request } from 'express';
import { body } from 'express-validator';
import {
	INTERNAL_ERROR,
	INVALID_EMAIL,
	INVALID_REQUEST,
	INVALID_UUID,
	NEW_PASSWORD_EQUALS_CURRENT,
	PASSWORD_CHANGE_FAILED,
	RECOVERY_CONFIRM_WITHOUT_RECOVERY_REQUESTED,
	RECOVERY_LINK_EXPIRED,
	TOKEN_REQUIRED,
} from 'utils-node/errors';
import { message } from '../../utils/messageBuilder';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailMessage } from '../../producers/emailProducer';
import { PASSWORD_RECOVERY_CODE_EXPIRATION } from '../../../env-config';
import logger from '../../logger';
import { isExpired } from 'utils-node';
import {
	getUsersEncryptedPassword,
	confirmRecovery,
	setRecoveryToken,
	userExistsByEmail,
	validateRecoveryToken
} from '../../repositories/auth/users';
import db from '../../db';
import AppError from '../../utils/appError';
import { verifyPassword } from '../../utils/password';
import asyncHandler from '../../utils/asyncHandler';
import { buildRecoveryUrl } from '../../utils/urlBuilders';
import {
	validate,
	emailBodyValidator,
	passwordBodyValidator
} from '../../middlewares/validatorMiddleware';

const router = Router();

router.post(
	'/',
	[
		emailBodyValidator(),
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const email: string = req.body.email;

		const { rowCount } = await userExistsByEmail(email);

		if (!rowCount) {
			throw new AppError({
				status: 400,
				message: 'Invalid email for password recovery provided.',
				errors: [
					{
						info: {
							code: INVALID_EMAIL.code,
							message: INVALID_EMAIL.messages[0],
						},
						data: {
							path: 'email',
							location: 'body',
						},
					},
				],
				log: {
					level: 'debug',
					message: 'Invalid email for password recovery provided',
					meta: { email },
				}
			});
		}

		logger.debug('Password recovery request confirmed', { email });

		return db.withTransaction(async (client) => {
			const token = uuidv4();

			const { rowCount } = await setRecoveryToken(
				email,
				token,
				client
			);

			if (!rowCount) {
				throw new AppError({
					status: 500,
					message: 'An unexpected error occurred while updating recovery token.',
					errors: [{ info: INTERNAL_ERROR }],
					log: {
						level: 'error',
						message: 'Failed to update recovery token',
						meta: { email },
					}
				});
			}

			logger.debug('Recovery token updated', { email });

			const recoveryUrl = buildRecoveryUrl(email, token);

			await sendEmailMessage({
				to: email,
				subject: 'Password Recovery',
				content: `You can change your password by following the link: ${recoveryUrl}`,
			});

			logger.debug('Recovery email sent', { email });

			return message('Recovery email was been send to the email provided.');
		});
	}),
);

router.post(
	'/confirm',
	[
		emailBodyValidator(),
		body('token')
			.exists().withMessage(TOKEN_REQUIRED)
			.isUUID('4').withMessage(INVALID_UUID),
		passwordBodyValidator(),
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const {
			email,
			token,
			password
		}: {
			email: string;
			token: string;
			password: string;
		} = req.body;

		const { rowCount, rows } = await validateRecoveryToken(email, token);

		if (!rowCount) {
			throw new AppError({
				status: 400,
				message: 'Invalid request for password recovery confirmation.',
				errors: [
					{
						info: INVALID_REQUEST,
						data: {
							location: 'body',
							paths: ['email', 'token'],
						},
					},
				],
				log: {
					level: 'debug',
					message: 'Invalid request for password recovery confirmation',
					meta: { email },
				}
			});
		}

		const recoverySentAt = rows[0].recovery_sent_at;

		if (!recoverySentAt) {
			throw new AppError({
				status: 404,
				message: 'Password recovery confirmation is being confirmed without requesting recovery link before that.',
				errors: [
					{
						info: RECOVERY_CONFIRM_WITHOUT_RECOVERY_REQUESTED,
						data: {
							location: 'body',
							path: 'token',
						},
					},
				],
				log: {
					level: 'debug',
					message: 'Password recovery confirmation is being confirmed without requesting recovery link before that',
					meta: { email },
				}
			});
		}

		if (isExpired(recoverySentAt, PASSWORD_RECOVERY_CODE_EXPIRATION)) {
			throw new AppError({
				status: 403,
				message: 'Password recovery token expired.',
				errors: [
					{
						info: RECOVERY_LINK_EXPIRED,
						data: {
							location: 'body',
							path: 'token',
						},
					},
				],
				log: {
					level: 'debug',
					message: 'Password recovery token expired',
					meta: { email },
				}
			});
		}

		logger.debug(`Password recovery request confirmed for email: ${email}`);

		const { rowCount: rowCount2, rows: rows2 } = await getUsersEncryptedPassword(email);

		if (!rowCount2) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occurred while changing password.',
				errors: [{ info: PASSWORD_CHANGE_FAILED }],
				log: {
					level: 'error',
					message: 'Password change failed',
					meta: { email },
				}
			});
		}

		const oldPasswordMatches = await verifyPassword(password, rows2[0].encrypted_password);

		if (oldPasswordMatches) {
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
					meta: { email },
				}
			});
		}

		const { rowCount: rowCount3 } = await confirmRecovery(email, password);

		if (!rowCount3) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occurred while updating password.',
				errors: [{ info: INTERNAL_ERROR }],
				log: {
					level: 'error',
					message: 'Password update failed',
					meta: { email },
				}
			});
		}

		logger.debug('Password successfully recovered', { email });

		return message('Password successfully recovered.');
	}),
);

export default router;
