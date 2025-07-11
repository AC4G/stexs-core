import { Router } from 'express';
import { Request } from 'express-jwt';
import logger from '../../logger';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	ISSUER
} from '../../../env-config';
import { mfaValidationMiddleware } from '../../utils/mfa';
import { signOutFromAllSessions, signOutFromSession } from '../../repositories/auth/refreshTokens';
import asyncHandler from '../../utils/asyncHandler';
import {
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken
} from '../../middlewares/jwtMiddleware';
import {
	validate,
	codeSupportedMFABodyValidator,
	typeSupportedMFABodyValidator
} from '../../middlewares/validatorMiddleware';

const router = Router();

router.post(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(),
	],
	asyncHandler(async (req: Request) => {
		const auth = req.auth!;
		const sub = auth?.sub!;
		const session_id: string = auth?.session_id!;

		const { rowCount } = await signOutFromSession(sub, session_id);

		if (!rowCount) {
			logger.debug('Sign-out: No refresh tokens found', {
				sub,
				session_id
			});

			return 404;
		}

		logger.debug('Sign-out successful', {
			sub,
			session_id
		});

		return 204;
	}),
);

router.post(
	'/all-sessions',
	[
		typeSupportedMFABodyValidator(),
		codeSupportedMFABodyValidator(),
		validate(),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(),
		mfaValidationMiddleware(),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;

		const { rowCount } = await signOutFromAllSessions(userId);

		if (!rowCount) {
			logger.debug('Sign-out from all sessions: No refresh tokens found', { userId });

			return 404;
		}

		logger.debug('Sign-out from all sessions successful', { userId });

		return 204;
	}),
);

export default router;
