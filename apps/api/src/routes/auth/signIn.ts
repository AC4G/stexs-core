import { Router, Request, Response } from 'express';
import { Request as JWTRequest } from 'express-jwt';
import db from '../../db';
import { body } from 'express-validator';
import generateAccessToken, {
	generateSignInConfirmToken,
} from '../../services/jwtService';
import {
	CustomValidationError,
	message,
} from 'utils-node/messageBuilder';
import {
	ACCOUNT_BANNED,
	CODE_REQUIRED,
	EMAIL_NOT_VERIFIED,
	FIELD_MUST_BE_A_STRING,
	IDENTIFIER_REQUIRED,
	INTERNAL_ERROR,
	INVALID_CREDENTIALS,
	INVALID_TYPE,
	PASSWORD_REQUIRED,
	TOKEN_REQUIRED,
	TYPE_REQUIRED,
	UNSUPPORTED_TYPE,
} from 'utils-node/errors';
import logger from '../../loggers/logger';
import {
	validate,
	validateSignInConfirmToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/middlewares';
import {
	AUDIENCE,
	ISSUER,
	SIGN_IN_CONFIRM_TOKEN_SECRET,
} from '../../../env-config';
import { validateMFA } from '../../services/mfaService';

const router = Router();

router.post(
	'/',
	[
		body('identifier')
			.notEmpty()
			.withMessage(IDENTIFIER_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		body('password')
			.notEmpty()
			.withMessage(PASSWORD_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { 
			identifier,
			password
		}: {
			identifier: string;
			password: string
		} = req.body;

		logger.debug(`Sign in for user: ${identifier} and identifier type: ${typeof identifier}`);

		try {
			const { rowCount, rows } = await db.query<{
				id: string;
				email_verified_at: Date | null;
				types: string[];
				banned_at: Date | null;
			}>(
				`
					SELECT 
						u.id, 
						u.email_verified_at,
						ARRAY_REMOVE(ARRAY[
							CASE WHEN mfa.email = TRUE THEN 'email' END,
							CASE WHEN mfa.totp_verified_at IS NOT NULL THEN 'totp' END
						], NULL) AS types,
						u.banned_at
					FROM auth.users AS u
					LEFT JOIN public.profiles AS p ON u.id = p.user_id
					LEFT JOIN auth.mfa ON u.id = mfa.user_id
					WHERE u.encrypted_password = extensions.crypt($2::text, u.encrypted_password)
						AND (
							(CASE WHEN $1::text ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN u.email ELSE p.username END) ILIKE $1::text
						);
				`,
				[identifier, password],
			);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Invalid credentials for sign in for user: ${identifier}`);
				return res
					.status(400)
					.json(
						message(
							'Sign In failed.',
							{},
							[
								{
									info: {
										code: INVALID_CREDENTIALS.code,
										message: INVALID_CREDENTIALS.messages[0],
									},
									data: {
										location: 'body',
										paths: ['identifier', 'password'],
									},
								},
							]
						)
					);
			}

			if (rows[0].banned_at) {
				logger.debug(`Attempt to sign in into a banned account for user: ${identifier}`);
				return res
					.status(400)
					.json(
						message(
							'Attempt to sign in into a banned account.',
							{}, 
							[{ info: ACCOUNT_BANNED }]
						)
					);
			}

			if (!rows[0].email_verified_at) {
				logger.debug(`Email not verified for user: ${identifier}`);
				return res
					.status(400)
					.json(
						message(
							'Email not verified.',
							{},
							[{ info: EMAIL_NOT_VERIFIED }]
						)
					);
			}

			let types = rows[0].types;

			const data = generateSignInConfirmToken(rows[0].id, types);

			logger.debug(`Sign-in initialized for user: ${identifier}`);

			res.json(message('Sign-in initialized successfully.', {
				...data,
				types,
			}));
		} catch (e) {
			logger.error(
				`Error during sign in for user: ${identifier}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred during sign in.',
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
		body('token')
			.notEmpty()
			.withMessage(TOKEN_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
		validateSignInConfirmToken(SIGN_IN_CONFIRM_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['sign_in_confirm']),
		transformJwtErrorMessages(logger),
	],
	async (req: JWTRequest, res: Response) => {
		const userId = req.auth?.sub!;
		const supportedTypes: string[] = req.auth?.types;
		const {
			type,
			code
		}: {
			type: string;
			code: string
		} = req.body;

		if (!supportedTypes.includes(type)) {
			logger.debug(`Unsupported MFA type provided for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'Unsupported MFA type provided.',
						{},
						[
							{
								info: UNSUPPORTED_TYPE,
								data: {
									location: 'body',
									path: 'token',
								},
							},
						]
					)
				);
		}

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
			const data = await generateAccessToken({
				sub: userId,
			});

			logger.debug(`Sign-in successful for user: ${userId}`);

			res.json(message('Sign-in successful.', { ...data }));
		} catch (e) {
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred during sign in confirmation.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

export default router;
