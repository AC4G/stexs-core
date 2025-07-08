import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import { message } from 'utils-node/messageBuilder';
import { INTERNAL_ERROR } from 'utils-node/errors';
import logger from '../../logger';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	ISSUER
} from '../../../env-config';
import {
	validate,
	validateAccessToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/middlewares';
import { mfaValidationMiddleware } from '../../utils/mfa';
import { signOutFromAllSessions, signOutFromSession } from '../../repositories/auth/refreshTokens';
import { codeSupportedMFABodyValidator, typeSupportedMFABodyValidator } from '../../utils/validators';

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
			const { rowCount } = await signOutFromSession(auth?.sub!, auth?.session_id!);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Sign-out: No refresh tokens found for user: ${auth?.sub} and session: ${auth?.session_id}`);
				return res.status(404).send();
			}
		} catch (e) {
			logger.error(
				`Error during sign out for user: ${auth?.sub} and session: ${auth?.session_id}. Error:  ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred during sign out.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		logger.debug(`Sign-out successful for user: ${auth?.sub} from session: ${auth?.session_id}`);

		res.status(204).send();
	},
);

router.post(
	'/all-sessions',
	[
		typeSupportedMFABodyValidator(),
		codeSupportedMFABodyValidator(),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
		mfaValidationMiddleware(),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;

		try {
			const { rowCount } = await signOutFromAllSessions(userId);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Sign-out from all sessions: No refresh tokens found for user: ${userId}`);
				return res.status(404).send();
			}
		} catch (e) {
			logger.error(
				`Sign-out from all sessions failed for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred during sign out from all sessions.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		logger.debug(`Sign-out from all sessions successful for user: ${userId}`);

		res.status(204).send();
	},
);

export default router;
