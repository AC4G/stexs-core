import { Router, Request } from 'express';
import { sendEmailMessage } from '../../producers/emailProducer';
import { message } from 'utils-node/messageBuilder';
import { body } from 'express-validator';
import {
	INTERNAL_ERROR,
	INVALID_INPUT_DATA,
	INVALID_USERNAME,
	USERNAME_REQUIRED,
} from 'utils-node/errors';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../logger';
import { validate } from 'utils-node/middlewares';
import { signUpUser } from '../../repositories/auth/users';
import { hashPassword } from '../../utils/password';
import AppError from '../../utils/appError';
import db from '../../db';
import { usernameRegex } from '../../utils/regex';
import { emailBodyValidator, passwordBodyValidator } from '../../utils/validators';
import asyncHandler from '../../utils/asyncHandler';
import { extractError } from 'utils-node/logger';
import { buildVerificationUrl } from '../../utils/urlBuilders';

const router = Router();

router.post(
	'/',
	[
		body('username')
			.exists().withMessage(USERNAME_REQUIRED)
			.isLength({ min: 1, max: 20 })
			.withMessage({
				code: INVALID_USERNAME.code,
				message: INVALID_USERNAME.messages[0],
			})
			.not().isEmail().withMessage({
				code: INVALID_USERNAME.code,
				message: INVALID_USERNAME.messages[1],
			})
			.matches(usernameRegex).withMessage({
				code: INVALID_USERNAME.code,
				message: INVALID_USERNAME.messages[2],
			}),
		emailBodyValidator(),
		passwordBodyValidator(),
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
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

		return db.withTransaction(async (client) => {
			try {
				const { rowCount } = await signUpUser(
					email,
					passwordHash,
					username,
					token,
					client
				);

				if (!rowCount) {
					throw new AppError({
						status: 500,
						message: 'An unexpected error occurred while signing up.',
						errors: [{ info: INTERNAL_ERROR }],
						log: {
							level: 'error',
							message: 'Signing up user failed',
							meta: { email },
						}
					});
				}
			} catch (err) {
				const error = err as { hint?: string | null };

				if (error.hint) {
					const path = error.hint.split(' ').pop()!;

					throw new AppError({
						status: 400,
						message: 'Invalid input data.', 
						errors: [
							{
								info: {
									code: INVALID_INPUT_DATA.code,
									message: error.hint + '.',
								},
								data: {
									path,
									location: 'body',
								}
							}
						],
						log: {
							level: 'debug',
							message: 'Sign up validation failed',
							meta: {
								username,
								email,
								path
							},
						}
					});
				}

				throw new AppError({
					status: 500,
					message: 'An unexpected error occurred while signing up.',
					errors: [{ info: INTERNAL_ERROR }],
					log: {
						level: 'error',
						message: 'Signing up user failed',
						meta: { error: extractError(err) },
					}
				});
			}

			const verificationUrl = buildVerificationUrl(email, token);

			await sendEmailMessage({
				to: email,
				subject: 'Email Verification',
				content: `Please verify your email. ${verificationUrl}`,
			});

			logger.debug('Sign up successful', { email });

			return [
				201,
				message('Sign up successful. Check your email for a verification link!')
			];
		});
	}),
);

export default router;
