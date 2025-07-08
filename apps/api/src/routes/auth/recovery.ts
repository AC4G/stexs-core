import {
	Router,
	Request,
	Response
} from 'express';
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
import { message } from 'utils-node/messageBuilder';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailMessage } from '../../producers/emailProducer';
import { PASSWORD_RECOVERY_CODE_EXPIRATION, REDIRECT_TO_RECOVERY } from '../../../env-config';
import { validate } from 'utils-node/middlewares';
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
import AppError, { transformAppErrorToResponse } from '../../utils/appError';
import { verifyPassword } from '../../utils/password';
import { emailBodyValidator, passwordBodyValidator } from '../../utils/validators';

const router = Router();

router.post(
	'/',
	[
		emailBodyValidator(),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const {
			email
		}: {
			email: string
		} = req.body;

		try {
			const { rowCount } = await userExistsByEmail(email);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Invalid email for password recovery: ${email}`);
				return res
					.status(400)
					.json(
						message(
							'Invalid email for password recovery provided.',
							{},
							[
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
							]
						)
					);
			}

			logger.debug(`Email checked for password recovery: ${email}`);
		} catch (e) {
			logger.error(
				`Error while checking email for password recovery for email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while checking email for password recovery.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		try {
			await db.withTransaction(async (client) => {
				const token = uuidv4();

				try {
					const { rowCount } = await setRecoveryToken(
						email,
						token,
						client
					);

					if (!rowCount || rowCount === 0) {
						logger.error(`Failed to update recovery token for email: ${email}`);

						throw new AppError(
							500,
							'An unexpected error occurred while updating recovery token.',
							[{ info: INTERNAL_ERROR }]
						)
					}

					logger.debug(`Recovery token successfully updated for email: ${email}`);
				} catch (e) {
					logger.error(
						`Error while updating recovery token for email: ${email}. Error: ${
							e instanceof Error ? e.message : e
						}`,
					);

					throw new AppError(
						500,
						'An unexpected error occurred while updating recovery token.',
						[{ info: INTERNAL_ERROR }]
					);
				}

				try {
					await sendEmailMessage({
						to: email,
						subject: 'Password Recovery',
						content: `You can change your password by following the link: ${
							REDIRECT_TO_RECOVERY + '?email=' + email + '&token=' + token
						}`,
					});
				} catch (e) {
					logger.error(
						`Error while sending recovery email to ${email}. Error: ${
							e instanceof Error ? e.message : e
						}`,
					);

					throw new AppError(
						500,
						'An unexpected error occurred while sending recovery email.',
						[{ info: INTERNAL_ERROR }]
					);
				}

				logger.debug(`Recovery email sent to: ${email}`);

				res.json(message('Recovery email was been send to the email provided.'));
			});
		} catch (e) {
			if (e instanceof AppError) {
				transformAppErrorToResponse(e, res);

				return;
			}

			logger.error(`Error initializing password recovery: ${e instanceof Error ? e.message : e}`);
			
			res.status(500).json(
				message(
					'Unexpected error occurred while initializing password recovery.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
		}
	},
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
	async (req: Request, res: Response) => {
		const {
			email,
			token,
			password
		}: {
			email: string;
			token: string;
			password: string;
		} = req.body;

		try {
			const { rowCount, rows } = await validateRecoveryToken(email, token);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Invalid request for password recovery confirmation with email: ${email}`);
				return res
					.status(400)
					.json(
						message(
							'Invalid request for password recovery confirmation.',
							{},
							[
								{
									info: INVALID_REQUEST,
									data: {
										location: 'body',
										paths: ['email', 'token'],
									},
								},
							]
						)
					);
			}

			const recoverySentAt = rows[0].recovery_sent_at;

			if (!recoverySentAt) {
				logger.debug(`Password recovery is being confirmed without requesting recovery before: ${email}`);
				return res
					.status(404)
					.json(
						message(
							'Password recovery confirmation is being confirmed without requesting recovery link before that.',
							{},
							[
								{
									info: RECOVERY_CONFIRM_WITHOUT_RECOVERY_REQUESTED,
									data: {
										location: 'body',
										path: 'token',
									},
								},
							]
						)
					);
			}

			if (isExpired(recoverySentAt, PASSWORD_RECOVERY_CODE_EXPIRATION)) {
				logger.debug(`Password recovery token expired for email: ${email}`);
				return res
					.status(403)
					.json(
						message(
							'Password recovery token expired.',
							{},
							[
								{
									info: RECOVERY_LINK_EXPIRED,
									data: {
										location: 'body',
										path: 'token',
									},
								},
							]
						)
					);
			}

			logger.debug(`Password recovery request confirmed for email: ${email}`);
		} catch (e) {
			logger.error(
				`Error while checking password recovery request for email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while checking password recovery request.',
						{},
						[{ info: INTERNAL_ERROR }]
					)					
				);
		}

		try {
			const { rowCount, rows } = await getUsersEncryptedPassword(email);

			if (!rowCount || rowCount === 0) {
				logger.error(`Password change failed for email: ${email}`);
				return res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while changing password.',
							{},
							[{ info: PASSWORD_CHANGE_FAILED }]
						)
					);
			}

			const oldPasswordMatches = await verifyPassword(password, rows[0].encrypted_password);

			if (oldPasswordMatches) {
				logger.debug(`New password matches the current password for email: ${email}`);
				return res
					.status(400)
					.json(
						message(
							'New password matches the current password.',
							{},
							[
								{
									info: NEW_PASSWORD_EQUALS_CURRENT,
									data: {
										path: 'password',
										location: 'body',
									},
								},
							]
						)
					);
			}

			const { rowCount: rowCount2 } = await confirmRecovery(email, password);

			if (!rowCount2 || rowCount2 === 0) {
				logger.error(`Failed to update password for email: ${email}`);
				return res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while updating password.',
							{},
							[{ info: INTERNAL_ERROR }]
						)
					);
			}

			logger.debug(`Password successfully recovered for email: ${email}`);

			res.json(message('Password successfully recovered.'));
		} catch (e) {
			logger.error(
				`Error while updating password for email: ${email}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while updating password.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

export default router;
