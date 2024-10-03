import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import db from '../database';
import {
	CustomValidationError,
	errorMessages,
} from 'utils-node/messageBuilder';
import {
	CODE_REQUIRED,
	INTERNAL_ERROR,
	INVALID_TYPE,
	TYPE_REQUIRED,
} from 'utils-node/errors';
import logger from '../loggers/logger';
import { ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER } from '../../env-config';
import {
	validateAccessToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/jwtMiddleware';
import { body } from 'express-validator';
import validate from 'utils-node/validatorMiddleware';
import { validateMFA } from '../services/mfaService';

const router = Router();

router.post(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const auth = req.auth;

		try {
			const { rowCount } = await db.query(
				`
          DELETE FROM auth.refresh_tokens
          WHERE user_id = $1::uuid 
            AND grant_type = 'password' 
            AND session_id = $2::uuid;
        `,
				[auth?.sub, auth?.session_id],
			);

			if (rowCount === 0) {
				logger.debug(
					`Sign-out: No refresh tokens found for user: ${auth?.sub} and session: ${auth?.session_id}`,
				);
				return res.status(404).send();
			}
		} catch (e) {
			logger.error(
				`Error during sign out for user: ${auth?.sub} and session: ${auth?.session_id}. Error:  ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		logger.debug(
			`Sign-out successful for user: ${auth?.sub} from session: ${auth?.session_id}`,
		);

		res.status(204).send();
	},
);

router.post(
	'/all-sessions',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
		body('code').notEmpty().withMessage(CODE_REQUIRED),
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
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;
		const { code, type } = req.body;

		let mfaError = await validateMFA(userId, type, code);

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
			const { rowCount } = await db.query(
				`
          DELETE FROM auth.refresh_tokens
          WHERE user_id = $1::uuid 
            AND grant_type = 'password';
        `,
				[userId],
			);

			if (rowCount === 0) {
				logger.debug(
					`Sign-out from all sessions: No refresh tokens found for user: ${userId}`,
				);
				return res.status(404).send();
			}
		} catch (e) {
			logger.error(
				`Sign-out from all sessions failed for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		logger.debug(`Sign-out from all sessions successful for user: ${userId}`);

		res.status(204).send();
	},
);

export default router;
