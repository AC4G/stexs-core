import {
	Router,
	Request,
	Response
} from 'express';
import { sendEmailMessage } from '../../producers/emailProducer';
import {
	message,
	CustomValidationError,
} from 'utils-node/messageBuilder';
import { body } from 'express-validator';
import { ISSUER } from '../../../env-config';
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
} from 'utils-node/errors';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../logger';
import { validate } from 'utils-node/middlewares';
import { signUpUser } from '../../repositories/auth/users';
import { hashPassword } from '../../services/password';
import AppError, { transformAppErrorToResponse } from '../../utils/appError';
import db from '../../db';

const router = Router();

router.post(
	'/',
	[
		body('username')
			.notEmpty()
			.withMessage(USERNAME_REQUIRED)
			.bail()
			.isLength({ min: 1, max: 20 })
			.withMessage({
				code: INVALID_USERNAME.code,
				message: INVALID_USERNAME.messages[0],
			})
			.custom((value: string) => {
				if (!/^[A-Za-z0-9._]+$/.test(value))
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
		body('email')
			.notEmpty()
			.withMessage(EMAIL_REQUIRED)
			.bail()
			.isEmail()
			.withMessage({
				code: INVALID_EMAIL.code,
				message: INVALID_EMAIL.messages[0],
			}),
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
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const {
			username,
			password,
			email
		}: {
			username: string;
			password: string;
			email: string;
		} = req.body;
		const token = uuidv4();
		const passwordHash = await hashPassword(password);

		try {
			await db.withTransaction(async (client) => {
				try {
					const { rowCount } = await signUpUser(
						email,
						passwordHash,
						username,
						token,
						client
					);

					if (!rowCount || rowCount === 0) {
						logger.error('Sign up: Database insertion failed.');

						throw new AppError(
							500,
							'Failed to sign up. Please try again.',
							[{ info: INTERNAL_ERROR }]
						);
					}
				} catch (e) {
					const err = e as { hint: string | null };

					if (err.hint) {
						const path = err.hint.split(' ').pop()!;

						logger.debug(`Sign up validation failed for user: ${username}, path: ${path}`);

						throw new AppError(
							400,
							'Failed to sign up because of invalid input.',
							[
								{
									info: {
										code: INVALID_INPUT_DATA.code,
										message: err.hint + '.',
									},
									data: {
										path,
										location: 'body',
									}
								}
							]
						)
					}

					logger.error(
						`Error during sign up: ${
							e instanceof Error ? e.message : e
						}`,
					);

					throw new AppError(
						500,
						'An unexpected error occurred while signing up.',
						[{ info: INTERNAL_ERROR }]
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

					logger.debug(`Sign up successful for user: ${username}`);

					res
						.status(201)
						.json(message('Sign up successful. Check your email for a verification link!'));
				} catch (e) {
					logger.error(
						`Sending verification email failed for email: ${email}. Error: ${
							e instanceof Error ? e.message : e
						}`,
					);

					throw new AppError(
						500,
						'An unexpected error occurred while sending verification email.',
						[{ info: INTERNAL_ERROR }]
					);
				}
			});
		} catch (e) {
			if (e instanceof AppError) {
				transformAppErrorToResponse(e, res);

				return;
			}

			logger.error(`Error initializing sign up: ${e instanceof Error ? e.message : e}`);
			
			res.status(500).json(
				message(
					'Unexpected error occurred while initializing sign up.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
		}
	},
);

export default router;
