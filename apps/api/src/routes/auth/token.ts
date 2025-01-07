import { Router, Response } from 'express';
import { message } from 'utils-node/messageBuilder';
import db from '../../db';
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
		const {
			sub,
			jti,
			session_id
		} = req.auth as {
			sub: string;
			jti: string;
			session_id: string;
		};

		try {
			const { rowCount } = await db.query(
				`
					DELETE FROM auth.refresh_tokens
					WHERE user_id = $1::uuid 
						AND grant_type = 'password' 
						AND token = $2::uuid 
						AND session_id = $3::uuid;
				`,
				[
					sub,
					jti,
					session_id
				],
			);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Refresh token invalid or expired for user: ${sub}`);
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

			logger.debug(`Refresh token successfully processed for user: ${sub} (Revoked)`);
		} catch (e) {
			logger.error(
				`Error while processing refresh token for user: ${sub}. Error: ${
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
				sub,
			});

			logger.debug(`A new access token generated for user: ${sub}`);

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
