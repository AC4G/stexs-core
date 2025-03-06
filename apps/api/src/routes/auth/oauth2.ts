import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import {
	CustomValidationError,
	message,
} from 'utils-node/messageBuilder';
import { body, param } from 'express-validator';
import {
	ARRAY_REQUIRED,
	CLIENT_ID_REQUIRED,
	CLIENT_NOT_FOUND,
	CLIENT_SECRET_REQUIRED,
	CODE_REQUIRED,
	CONNECTION_ALREADY_REVOKED,
	CONNECTION_ID_NOT_NUMERIC,
	CONNECTION_ID_REQUIRED,
	CONNECTION_NOT_FOUND,
	EMPTY_ARRAY,
	FIELD_MUST_BE_A_STRING,
	GRANT_TYPE_REQUIRED,
	INTERNAL_ERROR,
	INVALID_GRANT_TYPE,
	INVALID_REDIRECT_URL,
	INVALID_SCOPES,
	INVALID_TOKEN,
	INVALID_URL,
	INVALID_UUID,
	REDIRECT_URL_REQUIRED,
	REFRESH_TOKEN_REQUIRED,
	SCOPES_REQUIRED,
} from 'utils-node/errors';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';
import {
	authorizationCodeController,
	clientCredentialsController,
	refreshTokenController,
} from '../../controllers/auth/oauth2Controller';
import logger from '../../logger';
import { verify } from 'jsonwebtoken';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	ISSUER,
	REFRESH_TOKEN_SECRET,
} from '../../../env-config';
import {
	validate,
	validateAccessToken,
	validateRefreshToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/middlewares';
import { getRedirectUrlAndScopesByClientId } from '../../repositories/public/oauth2Apps';
import { connectionExistsByUserIdAndClientId } from '../../repositories/public/oauth2Connections';
import { setAuthorizationCode } from '../../repositories/auth/oauth2AuthorizationCodes';
import { insertOrUpdateAuthorizationCodeScopes } from '../../repositories/auth/oauth2AuthorizationCodeScopes';
import { updateConnectionScopes } from '../../repositories/public/oauth2ConnectionScopes';
import { deleteOAuth2Connection, revokeOAuth2RefreshToken } from '../../repositories/auth/refreshTokens';

const router = Router();

router.post(
	'/authorize',
	[
		body('client_id')
			.notEmpty()
			.withMessage(CLIENT_ID_REQUIRED)
			.bail()
			.custom((value) => {
				if (!validateUUID(value)) throw new CustomValidationError(INVALID_UUID);

				return true;
			}),
		body('redirect_url')
			.notEmpty()
			.withMessage(REDIRECT_URL_REQUIRED)
			.bail()
			.isURL()
			.withMessage(INVALID_URL),
		body('scopes')
			.notEmpty()
			.withMessage(SCOPES_REQUIRED)
			.bail()
			.isArray()
			.withMessage(ARRAY_REQUIRED)
			.bail()
			.custom((value) => {
				if (value.length === 0) throw new CustomValidationError(EMPTY_ARRAY);

				return true;
			}),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
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

		try {
			const { rowCount, rows } = await getRedirectUrlAndScopesByClientId(client_id);

			if (!rowCount || rowCount === 0) {
				logger.debug(`Client not found for client id: ${client_id}`);
				return res
					.status(404)
					.json(
						message(
							'Client not found.',
							{},
							[
								{ 
									info: CLIENT_NOT_FOUND, 
									data: { 
										location: 'body',
										paths: ['client_id']
									} 
								}
							]
						)
					);
			}

			if (rows[0].redirect_url !== redirect_url) {
				logger.debug(`Invalid redirect url for client: ${client_id}`);
				return res
					.status(400)
					.json(
						message(
							'Invalid redirect url.',
							{},
							[
								{ 
									info: INVALID_REDIRECT_URL, 
									data: { 
										location: 'body',
										paths: ['redirect_url']
									} 
								}
							]
						)
					);
			}

			const setScopes = rows[0].scopes || [];
			let invalidScopes: string[] = [];

			scopes.forEach((scope) => {
				if (!setScopes.includes(scope)) {
					invalidScopes.push(scope);
				}
			});

			if (invalidScopes.length > 0) {
				logger.debug(`Invalid scope for client: ${client_id}`);
				return res
					.status(400)
					.json(
						message(
							'Invalid scopes provided.',
							{},
							[
								{ 
									info: INVALID_SCOPES, 
									data: { 
										location: 'body',
										paths: ['scopes'],
										scopes: invalidScopes
									}
								}
							]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while fetching redirect url and scopes for client: ${client_id}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while validating redirect url and scopes.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		try {
			const { rowCount } = await connectionExistsByUserIdAndClientId(userId, client_id);

			if (rowCount && rowCount > 0) {
				await updateConnectionScopes(userId, client_id, scopes);

				return res.sendStatus(204);
			}
		} catch (e) {
			logger.error(
				`Error while checking client connection for user or inserting new scopes to an existing connection: ${userId} and client: ${client_id}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while checking client connection or adding new scopes.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		const code = uuidv4();
		let codeId: number;
		let expires: number;

		try {
			const { rowCount, rows } = await setAuthorizationCode(
				code,
				userId,
				client_id
			);

			if (!rowCount || rowCount === 0) {
				logger.error(
					`Failed to insert/update authorization token for user: ${userId} and client: ${client_id}`,
				);
				return res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while saving authorization token.',
							{},
							[{ info: INTERNAL_ERROR }]
						)
					);
			}

			logger.debug(`Authorization token inserted/updated successfully for user: ${userId} and client: ${client_id}`);

			codeId = rows[0].id;
			expires = rows[0].created_at.getTime() + 5 * 60 * 1000;
		} catch (e) {
			logger.error(
				`Error while inserting/updating authorization token for user: ${userId} and client: ${client_id}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while saving authorization token.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		try {
			await insertOrUpdateAuthorizationCodeScopes(codeId, scopes);
		} catch (e) {
			logger.error(
				`Error while inserting/updating authorization token scopes for token: ${codeId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while saving authorization token scopes.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		res.json(message(
			'Authorization token successfully created.',
			{
				code,
				expires
			}
		));
	},
);

const possibleGrantTypes = [
	'client_credentials',
	'authorization_code',
	'refresh_token',
];

router.post(
	'/token',
	[
		body('grant_type')
			.notEmpty()
			.withMessage(GRANT_TYPE_REQUIRED)
			.bail()
			.custom((value) => {
				if (!possibleGrantTypes.includes(value))
					throw new CustomValidationError({
						code: INVALID_GRANT_TYPE.code,
						message: INVALID_GRANT_TYPE.messages[1],
					});

				return true;
			}),
		body('client_id')
			.custom((value, { req }) => {
				if (
					!possibleGrantTypes.includes(req.body?.grant_type) ||
					req.body?.grant_type === 'refresh_token' ||
					req.body?.grant_type === undefined
				)
					return true;

				if (value === undefined || value.length === 0)
					throw new CustomValidationError(CLIENT_ID_REQUIRED);

				if (!validateUUID(value)) throw new CustomValidationError(INVALID_UUID);

				return true;
			}),
		body('client_secret')
			.custom((value, { req }) => {
				if (
					!possibleGrantTypes.includes(req.body?.grant_type) ||
					req.body?.grant_type === 'refresh_token' ||
					req.body?.grant_type === undefined
				)
					return true;

				if (value === undefined || value.length === 0)
					throw new CustomValidationError(CLIENT_SECRET_REQUIRED);

				return true;
			}),
		body('code')
			.custom((value, { req }) => {
				if (
					req.body?.grant_type !== 'authorization_code' ||
					req.body?.grant_type === undefined
				)
					return true;

				if (value === undefined || value.length === 0)
					throw new CustomValidationError(CODE_REQUIRED);

				return true;
			}),
		body('refresh_token')
			.custom((value, { req }) => {
				if (
					req.body?.grant_type !== 'refresh_token' ||
					req.body?.grant_type === undefined
				)
					return true;

				if (value === undefined || value.length === 0)
					throw new CustomValidationError(REFRESH_TOKEN_REQUIRED);

				if (req.body?.grant_type === 'refresh_token') {
					const token = req.body.refresh_token;

					verify(
						token,
						REFRESH_TOKEN_SECRET,
						{
							audience: AUDIENCE,
							issuer: ISSUER,
							algorithms: ['HS256'],
						},
						(e, decoded) => {
							if (e) throw new CustomValidationError(INVALID_TOKEN);

							if (typeof decoded === 'object' && 'grant_type' in decoded) {
								if (decoded?.grant_type !== 'authorization_code')
									throw new CustomValidationError({
										message: INVALID_GRANT_TYPE.messages[0],
										code: INVALID_GRANT_TYPE.code,
									});
							}

							req.auth = decoded;
						},
					);
				}

				return true;
			}),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const {
			grant_type
		}: {
			grant_type: string
		} = req.body;

		logger.debug(`OAuth2 Token Endpoint accessed with grant type: ${grant_type}`);

		switch (grant_type) {
			case 'authorization_code':
				authorizationCodeController(req, res);
				break;
			case 'client_credentials':
				clientCredentialsController(req, res);
				break;
			case 'refresh_token':
				refreshTokenController(req, res);
		}
	},
);

router.delete(
	'/connections/:connectionId',
	[
		param('connectionId')
			.notEmpty()
			.withMessage(CONNECTION_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(CONNECTION_ID_NOT_NUMERIC),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const { connectionId } = req.params;
		const userId = req.auth?.sub!;

		try {
			const { rowCount } = await deleteOAuth2Connection(Number(connectionId), userId);

			if (!rowCount || rowCount === 0) {
				logger.debug(`No connection found for deletion for user: ${userId} and connection: ${connectionId}`);
				return res
					.status(404)
					.json(
						message(
							'Connection not found.',
							{},
							[{ info: CONNECTION_NOT_FOUND }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while deleting connection for user: ${userId} and connection: ${connectionId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while deleting the connection.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		logger.debug(`Connection deleted successfully for user: ${userId} and connection: ${connectionId}`);

		res.send(message('Connection successfully deleted.'));
	},
);

router.delete(
	'/revoke',
	[
		body('refresh_token')
			.notEmpty()
			.withMessage(REFRESH_TOKEN_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
		validateRefreshToken(REFRESH_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['authorization_code']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const auth = req.auth;

		try {
			const { rowCount } = await revokeOAuth2RefreshToken(auth?.sub!, auth?.jti!);

			if (!rowCount || rowCount === 0) {
				logger.debug(`No connection found for revocation for user: ${auth?.sub}`);
				return res
					.status(404)
					.json(
						message(
							'Connection not found.',
							{},
							[{ info: CONNECTION_ALREADY_REVOKED }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while revoking connection for user: ${auth?.sub}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while revoking the connection.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		logger.debug(`Connection revoked successfully for user: ${auth?.sub}`);

		res.json(message('Connection successfully revoked.'));
	},
);

export default router;
