import { Router, Response } from 'express';
import { errorMessages } from 'utils-node/messageBuilder';
import db from '../database';
import generateAccessToken from '../services/jwtService';
import { Request } from 'express-jwt';
import {
	INTERNAL_ERROR,
	INVALID_TOKEN,
	REFRESH_TOKEN_REQUIRED,
} from 'utils-node/errors';
import logger from '../loggers/logger';
import { body } from 'express-validator';
import validate from 'utils-node/validatorMiddleware';
import {
	validateRefreshToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/jwtMiddleware';
import { AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from '../../env-config';

const router = Router();

router.post(
	'/',
	[
		body('refresh_token').notEmpty().withMessage(REFRESH_TOKEN_REQUIRED),
		validate(logger),
		validateRefreshToken(REFRESH_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const token = req.auth;

		try {
			const { rowCount } = await db.query(
				`
					DELETE FROM auth.refresh_tokens
					WHERE user_id = $1::uuid 
						AND grant_type = 'password' 
						AND token = $2::uuid 
						AND session_id = $3::uuid;
        		`,
				[token?.sub, token?.jti, token?.session_id],
			);

			if (rowCount === 0) {
				logger.debug(`Refresh token invalid or expired for user: ${token?.sub}`);
				return res.status(401).send(
					errorMessages([
						{
							info: INVALID_TOKEN,
							data: {
								location: 'body',
								path: 'refresh_token',
							},
						},
					]),
				);
			}

			logger.debug(
				`Refresh token successfully processed for user: ${token?.sub} (Revoked)`,
			);
		} catch (e) {
			logger.error(
				`Error while processing refresh token for user: ${token?.sub}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		try {
			const body = await generateAccessToken({
				sub: token?.sub,
			});

			res.json(body);

			logger.debug(`New access token generated for user: ${token?.sub}`);
		} catch (e) {
			res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}
	},
);

export default router;
