import { Response } from 'express';
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
import generateAccessToken, { generateMFAChallengeToken } from '../../services/jwtService';
import { Request } from 'express-jwt';
import logger from '../../logger';
import { isExpired } from 'utils-node';
import { deleteAuthorizationCode, validateAuthorizationCode } from '../../repositories/auth/oauth2AuthorizationCodes';
import { createOAuth2Connection } from '../../repositories/public/oauth2Connections';
import { validateClientCredentials } from '../../repositories/public/oauth2Apps';
import { deleteRefreshToken, validateOAuth2RefreshToken } from '../../repositories/auth/refreshTokens';
import { AUTHORIZATION_CODE_EXPIRATION } from '../../../env-config';
import { getUserAuth } from '../../repositories/auth/users';
import { compare } from 'bcrypt';
import db from '../../db';
import AppError, { transformAppErrorToResponse } from '../../utils/appError';

export async function authorizationCodeController(req: Request, res: Response) {
	const {
		code,
		client_id,
		client_secret: clientSecret
	}: {
		code: string;
		client_id: string;
		client_secret: string;
	} = req.body;

	let userId: string;
	let organization_id: number;
	let codeId: number;
	let scope_ids: number[];

	try {
		const { rowCount, rows } = await validateAuthorizationCode(
			code,
			client_id,
			clientSecret
		);

		if (!rowCount || rowCount === 0) {
			logger.debug(`Invalid authorization code for client: ${client_id} and code: ${code}`);
			return res
				.status(400)
				.json(
					message(
						'Invalid authorization code provided.',
						{},
						[
							{
								info: INVALID_AUTHORIZATION_CODE,
								data: {
									location: 'body',
									path: 'code',
								},
							},
						]
					)
				);
		}

		if (isExpired(rows[0].created_at, AUTHORIZATION_CODE_EXPIRATION)) {
			logger.debug(`Authorization code expired for client: ${client_id} and code: ${code}`);
			return res
				.status(400)
				.json(
					message(
						'Authorization code expired.',
						{},
						[
							{
								info: CODE_EXPIRED,
								data: {
									location: 'body',
									path: 'code',
								},
							},
						]
					)
				);
		}

		({
			id: codeId,
			user_id: userId,
			scope_ids,
			organization_id
		} = rows[0]);

		logger.debug(`Authorization code validated successfully for user: ${userId} and client: ${client_id}`);
	} catch (e) {
		logger.error(
			`Error while processing authorization code for client: ${client_id} and code: ${code}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occurred while processing authorization code.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	try {
		await db.withTransaction(async (client) => {
			try {
				const { rowCount } = await deleteAuthorizationCode(codeId, client);

				if (!rowCount || rowCount === 0) {
					logger.error(
						`Failed to delete authorization code for user: ${userId} and client: ${client_id}`,
					);

					throw new AppError(
						500,
						'An unexpected error occurred while preparing for the access token generation stage.',
						[{ info: INTERNAL_ERROR }]
					);
				}
			} catch (e) {
				logger.error(
					`Error while deleting authorization code for user: ${userId} and client: ${client_id}. Error: ${
						e instanceof Error ? e.message : e
					}`,
				);

				throw new AppError(
					500,
					'An unexpected error occurred while preparing for the access token generation stage.',
					[{ info: INTERNAL_ERROR }]
				);
			}

			let connectionId: number;

			try {
				const { rowCount, rows } = await createOAuth2Connection(
					userId,
					client_id,
					scope_ids,
					client
				);

				if (!rowCount || rowCount === 0) {
					logger.error(
						`Failed to insert connection for user: ${userId} and client: ${client_id}`,
					);

					throw new AppError(
						500,
						'An unexpected error occured while creating connection.',
						[{ info: INTERNAL_ERROR }]
					);
				}

				connectionId = rows[0].id;
			} catch (e) {
				logger.error(
					`Error while inserting connection for user: ${userId} and client: ${client_id}. Error: ${
						e instanceof Error ? e.message : e
					}`,
				);

				throw new AppError(
					500,
					'An unexpected error occured while creating connection.',
					[{ info: INTERNAL_ERROR }]
				);
			}

			logger.debug(`Connection successfully created for user: ${userId} and client: ${client_id}`);

			try {
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

				logger.debug(`Access token generated successfully for user: ${userId} and client: ${client_id}`);

				res.json(message('Connection successfully created.', { ...data }));
			} catch (e) {
				logger.error(
					`Error while generating access token for user: ${userId} and client: ${client_id}. Error: ${
						e instanceof Error ? e.message : e
					}`,
				)
				res
					.status(500)
					.json(
						message(
							'An unexpected error occurred while generating access token.',
							{},
							[{ info: INTERNAL_ERROR }]
						)
					);
			}
		});
	} catch (e) {
		if (e instanceof AppError) {
			transformAppErrorToResponse(e, res);

			return;
		}

		logger.error(`Authorization failed: ${e instanceof Error ? e.message : e}`);
		
		res.status(500).json(
			message(
				'Unexpected error occurred while authorizing.',
				{},
				[{ info: INTERNAL_ERROR }]
			)
		);
	}
}

export async function clientCredentialsController(req: Request, res: Response) {
	const {
		client_id,
		client_secret
	}: {
		client_id: string;
		client_secret: string;
	} = req.body;

	let organization_id: number;

	try {
		const { rowCount, rows } = await validateClientCredentials(client_id, client_secret);

		if (!rowCount || rowCount === 0) {
			logger.debug(`Invalid client credentials for client: ${client_id}`);
			return res
				.status(400)
				.json(
					message(
						'Invalid client credentials provided.',
						{},
						[
							{
								info: INVALID_CLIENT_CREDENTIALS,
								data: {
									location: 'body',
									paths: ['client_id', 'client_secret'],
								},
							},
						]
					),
				);
		}

		const scopes = rows[0].scope_ids;
		({ organization_id } = rows[0]);

		if (!scopes || scopes.length === 0) {
			logger.debug(`No client scopes selected for client: ${client_id}`);
			return res
				.status(400)
				.json(
					message(
						'No client scopes selected.',
						{},
						[{ info: NO_CLIENT_SCOPES_SELECTED }]
					)
				);
		}

		logger.debug(`Client credentials validated successfully for client: ${client_id}`);
	} catch (e) {
		logger.error(
			`Error while processing client credentials for client: ${client_id}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occurred while processing client credentials.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	try {
		const data = await generateAccessToken({
			additionalPayload: {
				client_id,
				organization_id,
			},
			grantType: 'client_credentials',
		});

		logger.debug(`Access token generated successfully for client: ${client_id}`);

		res.json(message('Access token retrieved successfully.', { ...data }));
	} catch (e) {
		res
			.status(500)
			.json(
				message(
					'An unexpected error occurred while generating access token.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}
}

export async function refreshTokenController(req: Request, res: Response) {
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
		try {
			await db.withTransaction(async (client) => {
				try {
					const { rowCount } = await deleteRefreshToken(
						sub,
						jti,
						session_id!,
						client
					);

					if (!rowCount || rowCount === 0) {
						logger.debug(`Refresh token invalid or expired for user: ${sub}`);

						throw new AppError(
							400,
							'Invalid refresh token.',
							[
								{
									info: INVALID_REFRESH_TOKEN,
									data: {
										location: 'body',
										path: 'refresh_token',
									},
								}
							]
						)
					}

					logger.debug(`Refresh token successfully processed for user: ${sub} (Revoked)`);
				} catch (e) {
					logger.error(
						`Error while processing refresh token for user: ${sub}. Error: ${
							e instanceof Error ? e.message : e
						}`,
					);

					throw new AppError(
						500,
						'An unexpected error occurred while processing refresh token.',
						[{ info: INTERNAL_ERROR }]
					);
				}

				try {
					const data = await generateAccessToken({
						additionalPayload: {
							sub,
							session_id,
						},
						client,
					});

					logger.debug(`A new access token generated for user: ${sub}`);

					res.json(message('Access token successfully generated.', { ...data }));
				} catch (e) {
					throw new AppError(
						500,
						'An unexpected error occurred while generating new access token.',
						[{ info: INTERNAL_ERROR }]
					)
				}
			});

			return;
		} catch (e) {
			if (e instanceof AppError) {
				transformAppErrorToResponse(e, res);

				return;
			}

			logger.error(`Failed to generate new access token: ${e instanceof Error ? e.message : e}`);
			
			res.status(500).json(
				message(
					'Unexpected error occurred while generating new access token.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
		}
    }

	try {
		const { rowCount } = await validateOAuth2RefreshToken(jti, sub);

		if (!rowCount || rowCount === 0) {
			logger.debug(`Invalid refresh token for user: ${sub} and client: ${client_id}`);
			return res
				.status(400)
				.json(
					message(
						'Invalid refresh token provided.',
						{},
						[
							{
								info: INVALID_REFRESH_TOKEN,
								data: {
									location: 'body',
									path: 'refresh_token',
								},
							},
						]
					),
				);
		}

		logger.debug(`Refresh token validated successfully for user: ${sub} and client: ${client_id}`);
	} catch (e) {
		logger.error(
			`Error while processing refresh token for user: ${sub} and client: ${client_id}. Error: ${
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

		logger.debug(`Access token retrieved successfully for user: ${sub} and client: ${client_id}`);

		res.json(message('Access token retrieved successfully.', { ...data }));
	} catch (e) {
		res
			.status(500)
			.json(
				message(
					'An unexpected error occurred while generating access token.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}
}

export async function passwordController(req: Request, res: Response) {
    const { 
        identifier,
        password
    }: {
        identifier: string;
        password: string
    } = req.body;

    logger.debug(`Sign in for user: ${identifier} and identifier type: ${typeof identifier}`);

    try {
        const { rowCount, rows } = await getUserAuth(identifier);

        if (!rowCount || rowCount === 0) {
            logger.debug(`No user found: ${identifier}`);
            return res
                .status(404)
                .json(
                    message(
                        'User not found.',
                        {},
                        [
                            {
                                info: USER_NOT_FOUND,
                                data: {
                                    location: 'body',
                                    paths: ['identifier'],
                                },
                            },
                        ]
                    )
                );
        }

        const row = rows[0];

        const isRightPassword = await compare(password, row.encrypted_password);

        if (!isRightPassword) {
            logger.debug(`Invalid credentials for user: ${identifier}`);
            return res
                .status(400)
                .json(
                    message(
                        'Invalid credentials.',
                        {},
                        [
                            {
                                info: INVALID_CREDENTIALS,
                                data: {
                                    location: 'body',
                                    paths: ['identifier', 'password'],
                                },
                            },
                        ]
                    )
                );
        }

        if (row.banned_at) {
            logger.debug(`Attempt to sign in into a banned account for user: ${identifier}`);
            return res
                .status(400)
                .json(
                    message(
                        'Attempt to sign in into a banned account.',
                        {}, 
                        [{ info: ACCOUNT_BANNED }]
                    )
                );
        }

        if (!row.email_verified_at) {
            logger.debug(`Email not verified for user: ${identifier}`);
            return res
                .status(400)
                .json(
                    message(
                        'Email not verified.',
                        {},
                        [{ info: EMAIL_NOT_VERIFIED }]
                    )
                );
        }

        let types = row.types;

        const data = generateMFAChallengeToken(row.id, types);

        logger.debug(`Sign-in initialized for user: ${identifier}`);

        res.json(message('Sign-in initialized successfully.', {
            ...data,
            types,
        }));
    } catch (e) {
        logger.error(
            `Error during sign in for user: ${identifier}. Error: ${
                e instanceof Error ? e.message : e
            }`,
        );
        return res
            .status(500)
            .json(
                message(
                    'An unexpected error occurred during sign in.',
                    {},
                    [{ info: INTERNAL_ERROR }]
                )
            );
    }
}

export async function mfaChallengeController(req: Request, res: Response) {
    const userId = req.auth?.sub!;

    try {
        const data = await generateAccessToken({
			additionalPayload: { sub: userId }
		});

        logger.debug(`Sign-in successful for user: ${userId}`);

        res.json(message('Sign-in successful.', { ...data }));
    } catch (e) {
        res
            .status(500)
            .json(
                message(
                    'An unexpected error occurred during sign in confirmation.',
                    {},
                    [{ info: INTERNAL_ERROR }]
                )
            );
    }
}
