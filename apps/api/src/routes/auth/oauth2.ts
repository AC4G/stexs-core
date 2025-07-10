import { Router } from 'express';
import { Request } from 'express-jwt';
import { message } from '../../utils/messageBuilder';
import { body, param } from 'express-validator';
import {
	ARRAY_MIN_ONE_REQUIRED,
	CLIENT_NOT_FOUND,
	CONNECTION_ALREADY_REVOKED,
	CONNECTION_ID_NOT_NUMERIC,
	CONNECTION_ID_REQUIRED,
	CONNECTION_NOT_FOUND,
	FIELD_MUST_BE_A_STRING,
	INTERNAL_ERROR,
	INVALID_REDIRECT_URL,
	INVALID_SCOPES,
	INVALID_URL,
	REDIRECT_URL_REQUIRED,
	REFRESH_TOKEN_REQUIRED,
	SCOPES_REQUIRED,
} from 'utils-node/errors';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../logger';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	AUTHORIZATION_CODE_EXPIRATION,
	ISSUER,
	REFRESH_TOKEN_SECRET,
} from '../../../env-config';
import { getRedirectUrlAndScopesByClientId } from '../../repositories/public/oauth2Apps';
import { connectionExistsByUserIdAndClientId } from '../../repositories/public/oauth2Connections';
import { setAuthorizationCode } from '../../repositories/auth/oauth2AuthorizationCodes';
import { insertOrUpdateAuthorizationCodeScopes } from '../../repositories/auth/oauth2AuthorizationCodeScopes';
import { updateConnectionScopes } from '../../repositories/public/oauth2ConnectionScopes';
import { deleteOAuth2Connection, revokeOAuth2RefreshToken } from '../../repositories/auth/refreshTokens';
import db from '../../db';
import AppError from '../../utils/appError';
import { clientIdBodyValidator } from '../../utils/validators';
import asyncHandler from '../../utils/asyncHandler';
import { validate } from '../../middlewares/validatorMiddleware';
import {
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken,
	validateRefreshToken
} from '../../middlewares/jwtMiddleware';

const router = Router();

router.post(
	'/authorize',
	[
		clientIdBodyValidator(),
		body('redirect_url')
			.notEmpty().withMessage(REDIRECT_URL_REQUIRED)
			.isURL().withMessage(INVALID_URL),
		body('scopes')
			.exists().withMessage(SCOPES_REQUIRED)
			.isArray({ min: 1 }).withMessage(ARRAY_MIN_ONE_REQUIRED),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;
		const { 
			client_id, 
			redirect_url, 
			scopes 
		}: { 
			client_id: string; 
			redirect_url: string; 
			scopes: string[] 
		} = req.body;

		const { rowCount, rows } = await getRedirectUrlAndScopesByClientId(client_id);

		if (!rowCount) {
			throw new AppError({
				status: 404,
				message: 'Client not found.',
				errors: [
					{ 
						info: CLIENT_NOT_FOUND, 
						data: { 
							location: 'body',
							paths: ['client_id']
						} 
					}
				],
				log: {
					level: 'debug',
					message: 'Client not found',
					meta: { client_id }
				}
			});
		}

		const row = rows[0];

		if (row.redirect_url !== redirect_url) {
			throw new AppError({
				status: 400,
				message: 'Invalid redirect url.',
				errors: [
					{ 
						info: INVALID_REDIRECT_URL, 
						data: { 
							location: 'body',
							paths: ['redirect_url']
						} 
					}
				],
				log: {
					level: 'debug',
					message: 'Invalid redirect url',
					meta: { client_id }
				}
			});
		}

		const setScopes = row.scopes || [];
		let invalidScopes: string[] = [];

		scopes.forEach((scope) => {
			if (!setScopes.includes(scope)) {
				invalidScopes.push(scope);
			}
		});

		if (invalidScopes.length > 0) {
			throw new AppError({
				status: 400,
				message: 'Invalid scopes provided.',
				errors: [
					{ 
						info: INVALID_SCOPES, 
						data: { 
							location: 'body',
							paths: ['scopes'],
							scopes: invalidScopes
						} 
					}
				],
				log: {
					level: 'debug',
					message: 'Invalid scopes provided',
					meta: { client_id }
				}
			});
		}

		return db.withTransaction(async (client) => {
			const { rowCount } = await connectionExistsByUserIdAndClientId(
				userId,
				client_id,
				client
			);

			if (rowCount && rowCount > 0) {
				await updateConnectionScopes(
					userId,
					client_id,
					scopes,
					client
				);

				return 204;
			}

			const code = uuidv4();

			const { rowCount: rowCount2, rows } = await setAuthorizationCode(
				code,
				userId,
				client_id,
				client
			);

			if (!rowCount2) {
				throw new AppError({
					status: 500,
					message: 'An unexpected error occurred while saving authorization token.',
					errors: [{ info: INTERNAL_ERROR }],
					log: {
						level: 'error',
						message: 'Error while inserting/updating authorization token',
						meta: {
							userId,
							client_id
						},
					}
				});
			}

			logger.debug('Authorization code successfully created', {
				userId,
				client_id
			});

			const row = rows[0];

			const codeId = row.id;
			const expires = row.created_at.getTime() + AUTHORIZATION_CODE_EXPIRATION * 1000;

			const { rowCount: rowCount3 } = await insertOrUpdateAuthorizationCodeScopes(
				codeId,
				scopes,
				client
			);

			if (!rowCount3) {
				throw new AppError({
					status: 500,
					message: 'An unexpected error occurred while saving authorization token scopes.',
					errors: [{ info: INTERNAL_ERROR }],
					log: {
						level: 'error',
						message: 'Error while inserting/updating authorization token scopes',
						meta: {
							userId,
							client_id,
							scopes
						},
					}
				});
			}

			return message(
				'Authorization token successfully created.',
				{
					code,
					expires
				}
			);
		});
	}),
);

router.delete(
	'/connections/:connectionId',
	[
		param('connectionId')
			.exists().withMessage(CONNECTION_ID_REQUIRED)
			.isNumeric().withMessage(CONNECTION_ID_NOT_NUMERIC),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const { connectionId } = req.params;
		const userId = req.auth?.sub!;

		const { rowCount } = await deleteOAuth2Connection(Number(connectionId), userId);

		if (!rowCount) {
			throw new AppError({
				status: 404,
				message: 'Connection not found.',
				errors: [{ info: CONNECTION_NOT_FOUND }],
				log: {
					level: 'debug',
					message: 'Connection not found for deletion',
					meta: {
						userId,
						connectionId
					},
				}
			});
		}

		logger.debug('Connection successfully deleted', {
			userId,
			connectionId
		});

		return message('Connection successfully deleted.');
	}),
);

router.delete(
	'/revoke',
	[
		body('refresh_token')
			.exists().withMessage(REFRESH_TOKEN_REQUIRED)
			.isString().withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
		validateRefreshToken(REFRESH_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['authorization_code']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const auth = req.auth;
		const userId = auth?.sub!;
		const refreshToken: string = req.body.jti!;

		const { rowCount } = await revokeOAuth2RefreshToken(userId, refreshToken);

		if (!rowCount) {
			throw new AppError({
				status: 404,
				message: 'Connection not found.',
				errors: [{ info: CONNECTION_ALREADY_REVOKED }],
				log: {
					level: 'debug',
					message: 'No Connection not found for revocation',
					meta: { userId },
				}
			});
		}

		logger.debug('Connection successfully revoked', { userId });

		return message('Connection successfully revoked.');
	}),
);

export default router;
