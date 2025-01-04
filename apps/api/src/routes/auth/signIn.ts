import { Router, Request, Response } from 'express';
import { Request as JWTRequest } from 'express-jwt';
import db from '../../db';
import { body } from 'express-validator';
import generateAccessToken, {
	generateSignInConfirmToken,
} from '../../services/jwtService';
import {
	CustomValidationError,
	errorMessages,
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
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		body('password')
			.notEmpty()
			.withMessage(PASSWORD_REQUIRED)
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

		logger.log('debug', `Sign in for user: ${identifier} and identifier type: ${typeof identifier}`);

		let uuid: string;
		let types: string[] = [];

		try {
			const { rowCount, rows } = await db.query(
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

			if (rowCount === 0) {
				logger.debug(`Invalid credentials for sign in for user: ${identifier}`);
				return res.status(400).json(
					errorMessages([
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
					]),
				);
			}

			if (rows[0].banned_at) {
				logger.debug(
					`Attempt to sign in to banned account for user: ${identifier}`,
				);
				return res.status(400).json(errorMessages([{ info: ACCOUNT_BANNED }]));
			}

			if (!rows[0].email_verified_at) {
				logger.debug(`Email not verified for user: ${identifier}`);
				return res
					.status(400)
					.json(errorMessages([{ info: EMAIL_NOT_VERIFIED }]));
			}

			uuid = rows[0].id;
			types = rows[0].types;
		} catch (e) {
			logger.error(
				`Error during sign in for user: ${identifier}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		const { token, expires } = generateSignInConfirmToken(uuid, types);

		logger.debug(`Sign-in initialized for user: ${identifier}`);

		res.json({
			token,
			types,
			expires,
		});
	},
);

router.post(
	'/confirm',
	[
		body('code')
			.notEmpty()
			.withMessage(CODE_REQUIRED),
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
			.withMessage(TOKEN_REQUIRED),
		validate(logger),
		validateSignInConfirmToken(SIGN_IN_CONFIRM_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['sign_in_confirm']),
		transformJwtErrorMessages(logger),
	],
	async (req: JWTRequest, res: Response) => {
		const userId = req.auth?.sub;
		const supportedTypes = req.auth?.types;
		const { type, code } = req.body;

		if (!supportedTypes.includes(type)) {
			logger.debug(`Unsupported MFA type provided for user: ${userId}`);
			return res.status(400).json(
				errorMessages([
					{
						info: UNSUPPORTED_TYPE,
						data: {
							location: 'body',
							path: 'token',
						},
					},
				]),
			);
		}

		let mfaError = await validateMFA(userId!, type, code);

		if (mfaError) {
			return res.status(mfaError.status).json(
				errorMessages([
					{
						info: mfaError.info,
						data: mfaError.data,
					},
				]),
			);
		}

		try {
			const body = await generateAccessToken({
				sub: userId,
			});

			res.json(body);

			logger.debug(`New access token generated for user: ${userId}`);
		} catch (e) {
			res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		logger.debug(`Sign-in successful for user: ${userId}`);
	},
);

export default router;
