import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import { body } from 'express-validator';
import {
	CODE_EXPIRED,
	CODE_REQUIRED,
	EMAIL_NOT_AVAILABLE,
	EMAIL_REQUIRED,
	FIELD_MUST_BE_A_STRING,
	INTERNAL_ERROR,
	INVALID_CODE,
	INVALID_EMAIL,
	INVALID_PASSWORD,
	INVALID_PASSWORD_LENGTH,
	INVALID_TYPE,
	NEW_PASSWORD_EQUALS_CURRENT,
	PASSWORD_CHANGE_FAILED,
	PASSWORD_REQUIRED,
	TYPE_REQUIRED,
	USER_NOT_FOUND,
} from 'utils-node/errors';
import {
	CustomValidationError,
	message,
} from 'utils-node/messageBuilder';
import sendEmail from '../../services/emailService';
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
import { validateMFA } from '../../services/mfaService';
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
import { compare } from 'bcrypt';

const router = Router();

router.get(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;

		try {
			const { rowCount, rows } = await getUserData(userId);

			if (!rowCount || rowCount === 0) {
				logger.error(`User not found for user id: ${userId}`);
				return res
					.status(404)
					.json(
						message(
							'User not found.',
							{},
							[{ info: USER_NOT_FOUND }]
						)
					);
			}

			logger.debug(`User data retrieve successful for user: ${userId}`);

			res.json(message('User data retrieved successfully.', rows[0]));
		} catch (e) {
			logger.error(
				`Error while fetching user data for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while retrieving user data.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

router.get(
	'/sessions',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;

		try {
			const { rowCount } = await getActiveUserSessions(userId);

			logger.debug(`Sessions amount retrieve successful for user: ${userId}`);

			res.json(message('Sessions amount retrieved successfully.', {
				amount: rowCount,
			}));
		} catch (e) {
			logger.error(
				`Error while fetching sessions amount for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while retrieving sessions amount.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

router.post(
	'/password',
	[
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
		body('code')
			.notEmpty()
			.withMessage(CODE_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
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
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;
		const {
			password,
			code,
			type
		}: {
			password: string;
			code: string;
			type: 'totp' | 'email';
		} = req.body;

		let mfaError = await validateMFA(userId, type, code);

		if (mfaError) {
			return res
				.status(mfaError.status)
				.json(
					message(
						'MFA validation failed.',
						{},
						[
							{
								info: mfaError.info,
								data: mfaError.data,
							},
						]
					)
				);
		}

		try {
			const { rowCount, rows } = await getUsersEncryptedPassword(userId);

			if (!rowCount || rowCount === 0) {
				logger.error(`Password change failed for user: ${userId}`);
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

			if (await compare(password, rows[0].encrypted_password)) {
				logger.debug(`New password matches the current password for user: ${userId}`);
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
			const { rowCount: rowCount2 } = await changePassword(userId, password);

			if (!rowCount2 || rowCount2 === 0) {
				logger.error(`Password change failed for user: ${userId}`);
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

			logger.debug(`Password change successful for user: ${userId}`);

			res.json(message('Password changed successfully.'));
		} catch (e) {
			logger.error(
				`Error while changing password for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while changing password.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

router.post(
	'/email',
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
		body('code')
			.notEmpty()
			.withMessage(CODE_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
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
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;
		const {
			email: newEmail,
			code,
			type
		}: {
			email: string;
			code: string;
			type: 'totp' | 'email';
		} = req.body;

		let mfaError = await validateMFA(userId, type, code);

		if (mfaError) {
			return res
				.status(mfaError.status)
				.json(
					message(
						'MFA validation failed.',
						{},
						[
							{
								info: mfaError.info,
								data: mfaError.data,
							},
						]
					)
				);
		}

		try {
			const { rowCount } = await userExistsByEmail(newEmail);

			if (rowCount && rowCount > 0) {
				logger.debug(`Provided email for change is already in use for user: ${userId}`);
				return res
					.status(403)
					.json(
						message(
							'Provided email is not available for use.',
							{},
							[{ info: EMAIL_NOT_AVAILABLE }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error during email change check for user: ${userId}. Error: ${
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

		const confirmationCode = generateCode(8);

		try {
			const { rowCount } = await initalizeEmailChange(userId, newEmail, confirmationCode);

			if (!rowCount || rowCount === 0) {
				logger.error(`Email change failed for user: ${userId}`);
				return res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while changing email.',
							{},
							[{ info: INTERNAL_ERROR }]
						)
					);
			}

			logger.debug(`Email change initiated for user: ${userId}`);
		} catch (e) {
			logger.error(
				`Error during email change initiation for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);

			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while changing email.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
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
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while sending email change verification link.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		logger.debug(`Email change verification link sent to ${newEmail}`);

		res.json(message('Email change verification link has been sent to the new email address.'));
	},
);

router.post(
	'/email/verify',
	[
		body('code')
			.notEmpty()
			.withMessage(CODE_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;
		const {
			code
		}: {
			code: string
		} = req.body;

		try {
			const { rowCount, rows } = await validateEmailChange(userId, code);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Invalid email verification code for user: ${userId}`);
				return res
					.status(400)
					.json(
						message(
							'Invalid email verification code.',
							{},
							[{ info: INVALID_CODE }]
						)
					);
			}

			const emailChangeSentAt = rows[0].email_change_sent_at;

			if (!emailChangeSentAt || isExpired(emailChangeSentAt, EMAIL_CHANGE_CODE_EXPIRATION)) {
				logger.debug(`Email change code expired for user: ${userId}`);
				return res
					.status(403)
					.json(
						message(
							'Email change code has expired.',
							{},
							[{ info: CODE_EXPIRED }]
						)
					);
			}

			const { rowCount: rowCount2 } = await finalizeEmailChange(userId);

			if (!rowCount2 || rowCount2 === 0) {
				logger.error(`Email verification failed for user: ${userId}`);
				return res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while verifying the new email.',
							{},
							[{ info: INTERNAL_ERROR }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error during email verification for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while verifying the new email.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		logger.debug(`Email successfully verified and changed for user: ${userId}`);

		res.json(message('Email successfully changed.'));
	},
);

export default router;
