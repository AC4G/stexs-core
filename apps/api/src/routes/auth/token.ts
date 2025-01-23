import { Router, Response } from 'express';
import { message } from 'utils-node/messageBuilder';
import generateAccessToken from '../../services/jwtService';
import { Request } from 'express-jwt';
import {
	FIELD_MUST_BE_A_STRING,
	INTERNAL_ERROR,
	INVALID_TOKEN,
	REFRESH_TOKEN_REQUIRED,
} from 'utils-node/errors';
import logger from '../../loggers/logger';
import { body } from 'express-validator';
import {
	validate,
	validateRefreshToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/middlewares';
import { AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from '../../../env-config';
import { deleteRefreshToken } from '../../repositories/auth/refreshTokens';

const router = Router();

router.post(
	'/',
	[
		body('refresh_token')
			.notEmpty()
			.withMessage(REFRESH_TOKEN_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
		validateRefreshToken(REFRESH_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const auth = req.auth;

		try {
			const { rowCount } = await deleteRefreshToken(auth?.sub!, auth?.jti!, auth?.session_id!);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Refresh token invalid or expired for user: ${auth?.sub}`);
				return res
					.status(401)
					.send(
						message(
							'Invalid refresh token.',
							{},
							[
								{
									info: INVALID_TOKEN,
									data: {
										location: 'body',
										path: 'refresh_token',
									},
								},
							]
						)
					);
			}

			logger.debug(`Refresh token successfully processed for user: ${auth?.sub} (Revoked)`);
		} catch (e) {
			logger.error(
				`Error while processing refresh token for user: ${auth?.sub}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while processing refresh token.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		try {
			const data = await generateAccessToken({
				sub: auth?.sub,
				session_id: auth?.session_id,
			});

			logger.debug(`A new access token generated for user: ${auth?.sub}`);

			res.json(message('Access token successfully generated.', { ...data }));
		} catch (e) {
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while generating new access token.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

export default router;
