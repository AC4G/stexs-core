import { message } from 'utils-node/messageBuilder';
import {
    ACCOUNT_BANNED,
	CODE_EXPIRED,
	EMAIL_NOT_VERIFIED,
	INTERNAL_ERROR,
	INVALID_AUTHORIZATION_CODE,
	INVALID_CLIENT_CREDENTIALS,
	INVALID_CREDENTIALS,
	INVALID_REFRESH_TOKEN,
	NO_CLIENT_SCOPES_SELECTED,
    USER_NOT_FOUND,
} from 'utils-node/errors';
import generateAccessToken, { generateMFAChallengeToken } from '../../utils/jwt';
import { Request } from 'express-jwt';
import logger from '../../logger';
import { isExpired } from 'utils-node';
import { deleteAuthorizationCode, validateAuthorizationCode } from '../../repositories/auth/oauth2AuthorizationCodes';
import { createOAuth2Connection } from '../../repositories/public/oauth2Connections';
import { validateClientCredentials } from '../../repositories/public/oauth2Apps';
import { deleteRefreshToken, validateOAuth2RefreshToken } from '../../repositories/auth/refreshTokens';
import { AUTHORIZATION_CODE_EXPIRATION } from '../../../env-config';
import { getUserAuth } from '../../repositories/auth/users';
import db from '../../db';
import AppError from '../../utils/appError';
import { verifyPassword } from '../../utils/password';
import { AsyncHandlerResult } from '../../utils/asyncHandler';

export async function authorizationCodeController(req: Request): Promise<AsyncHandlerResult> {
	const {
		code,
		client_id,
		client_secret: clientSecret
	}: {
		code: string;
		client_id: string;
		client_secret: string;
	} = req.body;

	const { rowCount, rows } = await validateAuthorizationCode(
		code,
		client_id,
		clientSecret
	);

	if (!rowCount) {
		throw new AppError({
			status: 400,
			message: 'Invalid authorization code provided.',
			errors: [
				{
					info: INVALID_AUTHORIZATION_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				}
			],
			log: {
				level: 'debug',
				message: 'Invalid authorization code provided',
				meta: {
					client_id,
					code
				},
			}
		});
	}

	if (isExpired(rows[0].created_at, AUTHORIZATION_CODE_EXPIRATION)) {
		throw new AppError({
			status: 400,
			message: 'Authorization code expired.',
			errors: [
				{
					info: CODE_EXPIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			],
			log: {
				level: 'debug',
				message: 'Authorization code expired',
				meta: {
					client_id,
					code
				},
			}
		})
	}

	const {
		id: codeId,
		user_id: userId,
		scope_ids,
		organization_id
	}: {
		id: number;
		user_id: string;
		scope_ids: number[];
		organization_id: number;
	} = rows[0];

	logger.debug('Authorization code validated successfully', {
		client_id,
		codeId,
		userId,
		scope_ids,
		organization_id,
	});

	return db.withTransaction(async (client) => {
		const { rowCount } = await deleteAuthorizationCode(codeId, client);

		if (!rowCount) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occurred while preparing for the access token generation stage.',
				errors: [{ info: INTERNAL_ERROR }],
				log: {
					level: 'error',
					message: 'Failed to delete authorization code',
					meta: {
						client_id,
						codeId,
						userId
					},
				}
			});
		}

		const { rowCount: rowCount2, rows } = await createOAuth2Connection(
			userId,
			client_id,
			scope_ids,
			client
		);

		if (!rowCount2) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occured while creating connection.',
				errors: [{ info: INTERNAL_ERROR }],
				log: {
					level: 'error',
					message: 'Failed to insert connection',
					meta: {
						userId,
						client_id,
						scope_ids
					},
				}
			});
		}

		const connectionId = rows[0].id;

		logger.debug('Connection successfully created', {
			client_id,
			userId,
			connectionId
		});

		const data = await generateAccessToken({
			additionalPayload: {
				sub: userId,
				client_id,
				organization_id,
			},
			grantType: 'authorization_code',
			connectionId,
			client
		});

		logger.debug('Access token generated successfully', {
			client_id,
			userId,
			connectionId,
			...data
		});

		return message('Connection successfully created.', { ...data });
	});
}

export async function clientCredentialsController(req: Request): Promise<AsyncHandlerResult> {
	const {
		client_id,
		client_secret
	}: {
		client_id: string;
		client_secret: string;
	} = req.body;

	const { rowCount, rows } = await validateClientCredentials(client_id, client_secret);

	if (!rowCount) {
		throw new AppError({
			status: 400,
			message: 'Invalid client credentials provided.',
			errors: [
				{
					info: INVALID_CLIENT_CREDENTIALS,
					data: {
						location: 'body',
						paths: ['client_id', 'client_secret'],
					},
				},
			],
			log: {
				level: 'debug',
				message: 'Invalid client credentials provided',
				meta: { client_id },
			}
		});
	}

	const scopes = rows[0].scope_ids;
	const organization_id = rows[0].organization_id;

	if (!scopes || scopes.length === 0) {
		throw new AppError({
			status: 400,
			message: 'No client scopes selected.',
			errors: [{ info: NO_CLIENT_SCOPES_SELECTED }],
			log: {
				level: 'debug',
				message: 'No client scopes selected',
				meta: { client_id },
			}
		});
	}

	logger.debug('Client credentials validated successfully', { client_id });

	const data = await generateAccessToken({
		additionalPayload: {
			client_id,
			organization_id,
		},
		grantType: 'client_credentials',
	});

	logger.debug('Access token generated successfully', {
		client_id,
		organization_id,
		...data
	});

	return message('Access token retrieved successfully.', { ...data });
}

export async function refreshTokenController(req: Request): Promise<AsyncHandlerResult> {
	const {
		sub,
		client_id,
		organization_id,
		jti,
        grant_type,
        session_id
	} = req.auth as {
		sub: string;
		client_id: string;
		organization_id: number;
		jti: string;
        grant_type: 'authorization_code' | 'password';
        session_id?: string
	};

    if (grant_type === 'password') {
		return db.withTransaction(async (client) => {
			const { rowCount } = await deleteRefreshToken(
				sub,
				jti,
				session_id!,
				client
			);

			if (!rowCount) {
				throw new AppError({
					status: 400,
					message: 'Invalid refresh token.',
					errors: [
						{
							info: INVALID_REFRESH_TOKEN,
							data: {
								location: 'cookies',
								path: 'refresh_token',
							}
						}
					],
					log: {
						level: 'debug',
						message: 'Invalid refresh token',
						meta: { sub }
					}
				});
			}

			logger.debug('Refresh token revoked successfully', {
				sub,
				session_id
			});

			const data = await generateAccessToken({
				additionalPayload: {
					sub,
					session_id,
				},
				client,
			});

			logger.debug('Access token regenerated successfully', {
				sub,
				session_id,
				...data
			});

			return message('Access token successfully generated.', { ...data });
		});
    }

	const { rowCount } = await validateOAuth2RefreshToken(jti, sub);

	if (!rowCount) {
		throw new AppError({
			status: 400,
			message: 'Invalid refresh token provided.',
			errors: [
				{
					info: INVALID_REFRESH_TOKEN,
					data: {
						location: 'cookies',
						path: 'refresh_token',
					}
				}
			],
			log: {
				level: 'debug',
				message: 'Invalid refresh token provided',
				meta: {
					sub,
					client_id
				}
			}
		});
	}

	logger.debug('Refresh token validated successfully', {
		sub,
		client_id
	});

	const data = await generateAccessToken({
		additionalPayload: {
			sub,
			client_id,
			organization_id,
		},
		grantType: 'authorization_code',
		connectionId: null,
		refreshToken: null,
		oldRefreshToken: jti,
	});

	logger.debug('Access token retrieved successfully', {
		sub,
		client_id,
		organization_id,
		...data
	});

	return message('Access token retrieved successfully.', { ...data });
}

export async function passwordController(req: Request): Promise<AsyncHandlerResult> {
    const { 
        identifier,
        password
    }: {
        identifier: string;
        password: string
    } = req.body;

	const { rowCount, rows } = await getUserAuth(identifier);

	if (!rowCount) {
		throw new AppError({
			status: 404,
			message: 'User not found.',
			errors: [
				{
					info: USER_NOT_FOUND,
					data: {
						location: 'body',
						paths: ['identifier'],
					}
				}
			],
			log: {
				level: 'debug',
				message: 'User not found',
				meta: { identifier }
			}
		});
	}

	const row = rows[0];

	const isRightPassword = await verifyPassword(password, row.encrypted_password);

	if (!isRightPassword) {
		throw new AppError({
			status: 400,
			message: 'Invalid credentials.',
			errors: [
				{
					info: INVALID_CREDENTIALS,
					data: {
						location: 'body',
						paths: ['identifier', 'password'],
					}
				}
			],
			log: {
				level: 'debug',
				message: 'Invalid credentials',
				meta: { identifier }
			}
		});
	}

	if (row.banned_at) {
		throw new AppError({
			status: 400,
			message: 'Attempt to sign in into a banned account.',
			errors: [{ info: ACCOUNT_BANNED }],
			log: {
				level: 'debug',
				message: 'Attempt to sign in into a banned account',
				meta: { identifier }
			}
		});
	}

	if (!row.email_verified_at) {
		throw new AppError({
			status: 400,
			message: 'Email not verified.',
			errors: [{ info: EMAIL_NOT_VERIFIED }],
			log: {
				level: 'debug',
				message: 'Email not verified',
				meta: { identifier }
			}
		});
	}

	const types = row.types;

	const data = generateMFAChallengeToken(row.id, types);

	logger.debug('Sign-in initialized successfully', { identifier });

	return message('Sign-in initialized successfully.', {
		...data,
		types,
	});
}

export async function mfaChallengeController(req: Request): Promise<AsyncHandlerResult> {
    const userId = req.auth?.sub!;

	const { refresh_token, ...data } = await generateAccessToken({
		additionalPayload: { sub: userId }
	});

	logger.debug('Sign-in successful.', { userId });

	return {
		status: 200,
		body: message('Sign-in successful.', { ...data }),
		cookies: [
			{
				name: 'refresh_token',
				value: refresh_token!,
				options: {
					httpOnly: true,
					secure: true,
					sameSite: 'strict',
					path: '/auth/token?grant_type=refresh_token'
				}
			}
		]
	};
}
