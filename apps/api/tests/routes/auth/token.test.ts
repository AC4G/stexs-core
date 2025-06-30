import {
	expect,
	jest,
	describe,
	afterEach,
	it,
	beforeAll,
	afterAll,
} from '@jest/globals';

const mockQuery = jest.fn();

import { NextFunction } from 'express';
import request from 'supertest';
import server from '../../../src/server';
import { CLIENT_ID_REQUIRED, CLIENT_SECRET_REQUIRED, CODE_EXPIRED, CODE_REQUIRED, EMAIL_NOT_VERIFIED, GRANT_TYPE_REQUIRED, IDENTIFIER_REQUIRED, INVALID_AUTHORIZATION_CODE, INVALID_CLIENT_CREDENTIALS, INVALID_GRANT_TYPE, INVALID_REFRESH_TOKEN, INVALID_TOKEN, INVALID_TYPE, INVALID_UUID, NO_CLIENT_SCOPES_SELECTED, PASSWORD_REQUIRED, REFRESH_TOKEN_REQUIRED, TOKEN_REQUIRED, TYPE_REQUIRED, USER_NOT_FOUND } from 'utils-node/errors';
import { message } from 'utils-node/messageBuilder';
import { advanceTo, clear } from 'jest-date-mock';
import { sign } from 'jsonwebtoken';
import { AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from '../../../env-config';
import logger from '../../../src/logger';
import { hashPassword } from '../../../src/services/password';

jest.mock('utils-node/middlewares', () => {
	const before = jest.requireActual('utils-node/middlewares') as typeof import('utils-node/middlewares');

	return {
		validate: before.validate,
		validateAccessToken: jest.fn(
			() => (req: Request, res: Response, next: NextFunction) => next(),
		),
		validateRefreshToken: jest.fn(
			() => (req: Request, res: Response, next: NextFunction) => next(),
		),
		validateSignInConfirmOrAccessToken: jest.fn(
			() => (req: Request, res: Response, next: NextFunction) => next(),
		),
		checkTokenGrantType: jest.fn(
			() => (req: Request, res: Response, next: NextFunction) => next(),
		),
		validateSignInConfirmToken: jest.fn(
			() => (req: Request, res: Response, next: NextFunction) => next(),
		),
		transformJwtErrorMessages: jest.fn(
			() => (err: Object, req: Request, res: Response, next: NextFunction) => {},
		),
		checkScopes: jest.fn(
			() => (err: Object, req: Request, res: Response, next: NextFunction) => {},
		),
	}
});

jest.mock('../../../src/db', () => {
	return {
		__esModule: true,
		default: {
			query: mockQuery,
		},
	};
});

describe('Token Route', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	beforeAll(() => {
		advanceTo(new Date('2023-09-15T12:00:00'));
	});

	afterAll(() => {
		clear();
	});

	it('should handle token route with grant type refresh token with not stored refresh token', async () => {
		const refreshToken = sign(
			{ grant_type: 'authorization_code' },
			REFRESH_TOKEN_SECRET,
			{
				audience: AUDIENCE,
				issuer: ISSUER,
				algorithm: 'HS256',
			},
		);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=refresh_token')
			.send({ refresh_token: refreshToken });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Invalid refresh token provided.', {}, [
				{
					info: INVALID_REFRESH_TOKEN,
					data: {
						location: 'body',
						path: 'refresh_token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route without grant type', async () => {
		const response = await request(server)
			.post('/auth/token');

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: GRANT_TYPE_REQUIRED,
					data: {
						location: 'query',
						path: 'grant_type',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with invalid grant type', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=invalid_grant_type')
			.send();

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: {
						code: INVALID_GRANT_TYPE.code,
						message: INVALID_GRANT_TYPE.messages[1],
					},
					data: {
						location: 'query',
						path: 'grant_type',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with authorization code without client id, client secret and code', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=authorization_code')
			.send();

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CLIENT_ID_REQUIRED,
					data: {
						location: 'body',
						path: 'client_id',
					},
				},
				{
					info: CLIENT_SECRET_REQUIRED,
					data: {
						location: 'body',
						path: 'client_secret',
					},
				},
				{
					info: CODE_REQUIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with authorization code with invalid client id format', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=authorization_code')
			.send({
				code: 'code',
				client_id: 'id',
				client_secret: 'secret',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_UUID,
					data: {
						location: 'body',
						path: 'client_id',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with authorization code with invalid authorization code', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=authorization_code')
			.send({
				code: 'code',
				client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
				client_secret: 'secret',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Invalid authorization code provided.', {}, [
				{
					info: INVALID_AUTHORIZATION_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with authorization code with expired authorization code', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					user_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d99',
					created_at: '2023-09-15T11:54:00',
					scopes: ['inventory.read'],
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=authorization_code')
			.send({
				code: 'code',
				client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
				client_secret: 'secret',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Authorization code expired.', {}, [
				{
					info: CODE_EXPIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with authorization code', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					user_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d99',
					created_at: '2023-09-15T12:00:00',
					scopes: ['inventory.read'],
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=authorization_code')
			.send({
				code: 'code',
				client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
				client_secret: 'secret',
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Connection successfully created.', {
				access_token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				refresh_token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				token_type: 'bearer',
				expires: expect.any(Number),
			}).onTest(),
		);
	});

	it('should handle token route with grant type client credentials without client secret and client id', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=client_credentials')
			.send();

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CLIENT_ID_REQUIRED,
					data: {
						location: 'body',
						path: 'client_id',
					},
				},
				{
					info: CLIENT_SECRET_REQUIRED,
					data: {
						location: 'body',
						path: 'client_secret',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with grant type client credentials with invalid credentials', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=client_credentials')
			.send({
				client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
				client_secret: 'secret',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Invalid client credentials provided.', {}, [
				{
					info: INVALID_CLIENT_CREDENTIALS,
					data: {
						location: 'body',
						paths: ['client_id', 'client_secret'],
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with grant type client credentials with no scopes selected', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					scopes: [],
					organization_id: 1,
					project_id: 1,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=client_credentials')
			.send({
				client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
				client_secret: 'secret',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('No client scopes selected.', {}, [
				{ info: NO_CLIENT_SCOPES_SELECTED }
			]).onTest(),
		);
	});

	it('should handle token route with grant type as client credentials', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					scope_ids: [1,2,3,4],
					organization_id: 1,
					project_id: 1,
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=client_credentials')
			.send({
				client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
				client_secret: 'secret',
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Access token retrieved successfully.', {
				access_token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				token_type: 'bearer',
				expires: expect.any(Number),
			}).onTest(),
		);
	});

	it('should handle token route with grant type refresh token without refresh token', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=refresh_token')
			.send();

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: REFRESH_TOKEN_REQUIRED,
					data: {
						location: 'body',
						path: 'refresh_token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with grant type refresh token with invalid refresh token', async () => {
		const refreshToken = sign(
			{ grant_type: 'authorization_code' },
			'invalid-secret',
			{
				audience: AUDIENCE,
				issuer: ISSUER,
				algorithm: 'HS256',
			},
		);

		const response = await request(server)
			.post('/auth/token?grant_type=refresh_token')
			.send({ refresh_token: refreshToken });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_REFRESH_TOKEN,
					data: {
						location: 'body',
						path: 'refresh_token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with grant type refresh token with invalid grant type inside refresh token', async () => {
		const refreshToken = sign({ grant_type: 'invalid_grant_type' }, REFRESH_TOKEN_SECRET, {
			audience: AUDIENCE,
			issuer: ISSUER,
			algorithm: 'HS256',
		});

		const response = await request(server)
			.post('/auth/token?grant_type=refresh_token')
			.send({	refresh_token: refreshToken });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: {
						code: INVALID_GRANT_TYPE.code,
						message: INVALID_GRANT_TYPE.messages[0],
					},
					data: {
						location: 'body',
						path: 'refresh_token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle token route with grant type refresh token', async () => {
		const refreshToken = sign(
			{ grant_type: 'authorization_code' },
			REFRESH_TOKEN_SECRET,
			{
				audience: AUDIENCE,
				issuer: ISSUER,
				algorithm: 'HS256',
			},
		);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=refresh_token')
			.send({	refresh_token: refreshToken });

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Access token retrieved successfully.', {
				access_token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				refresh_token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				token_type: 'bearer',
				expires: expect.any(Number),
			}).onTest(),
		);
	});

	it('should handle refresh with already signed out session', async () => {
		const refreshToken = sign(
			{ grant_type: 'password' },
			'invalid-secret',
			{
				audience: AUDIENCE,
				issuer: ISSUER,
				algorithm: 'HS256',
			},
		);

		const response = await request(server)
			.post('/auth/token?grant_type=refresh_token')
			.send({ refresh_token: refreshToken });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_REFRESH_TOKEN,
					data: {
						location: 'body',
						path: 'refresh_token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle refresh', async () => {
		const refreshToken = sign(
			{ grant_type: 'password' },
			REFRESH_TOKEN_SECRET,
			{
				audience: AUDIENCE,
				issuer: ISSUER,
				algorithm: 'HS256',
			},
		);

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=refresh_token')
			.send({ refresh_token: refreshToken });

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject(
			message('Access token successfully generated.', {
				access_token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				refresh_token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				token_type: 'bearer',
				expires: expect.any(Number),
			}).onTest(),
		);
	});

	it('should handle sign in without identifier', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=password')
			.send({ password: 'Test123.' });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: IDENTIFIER_REQUIRED,
					data: {
						location: 'body',
						path: 'identifier',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign in without password', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=password')
			.send({ identifier: 'test' });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: PASSWORD_REQUIRED,
					data: {
						location: 'body',
						path: 'password',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign in to an unknown user', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=password')
			.send({
				identifier: 'test',
				password: 'Test123.',
			});

		console.log(JSON.stringify(response.body));

		expect(response.status).toBe(404);
		expect(response.body).toEqual(
			message('User not found.', {}, [
				{
					info: USER_NOT_FOUND,
					data: {
						location: 'body',
						paths: ['identifier'],
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign in without verified email', async () => {
		const password = 'Test123.';
		const passwordHash = await hashPassword(password);

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					email_verified_at: null,
					encrypted_password: passwordHash,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=password')
			.send({
				identifier: 'test',
				password,
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Email not verified.', {}, [{ info: EMAIL_NOT_VERIFIED }]).onTest(),
		);
	});

	it('should handle sign in initialization with email MFA', async () => {
		const password = 'Test123.';
		const passwordHash = await hashPassword(password);

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					email_verified_at: '2023-08-21T12:34:56Z',
					encrypted_password: passwordHash,
					types: ['email'],
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=password')
			.send({
				identifier: 'test',
				password,
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Sign-in initialized successfully.', {
				token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				types: ['email'],
				expires: expect.any(Number),
			}).onTest()
		);
	});

	it('should handle sign in initialization with totp MFA', async () => {
		const password = 'Test123.';
		const passwordHash = await hashPassword(password);

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					email_verified_at: '2023-08-21T12:34:56Z',
					encrypted_password: passwordHash,
					types: ['totp'],
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token?grant_type=password')
			.send({
				identifier: 'test',
				password,
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Sign-in initialized successfully.', {
				token: expect.stringMatching(
					/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
				),
				types: ['totp'],
				expires: expect.any(Number),
			}).onTest(),
		);
	});

	it('should handle sign in mfa challenge without code', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=mfa_challenge')
			.send({
				type: 'totp',
				token: 'token',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CODE_REQUIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign in mfa challenge without type', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=mfa_challenge')
			.send({
				code: 'code',
				token: 'token',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: TYPE_REQUIRED,
					data: {
						location: 'body',
						path: 'type',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign in mfa challenge without token', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=mfa_challenge')
			.send({
				code: 'code',
				type: 'totp',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: TOKEN_REQUIRED,
					data: {
						location: 'body',
						path: 'token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign in mfa challenge with unsupported type', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=mfa_challenge')
			.send({
				code: 'code',
				type: 'sms',
				token: 'token',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_TYPE,
					data: {
						location: 'body',
						path: 'type',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign in mfa challenge', async () => {
		const response = await request(server)
			.post('/auth/token?grant_type=mfa_challenge')
			.send({
				code: 'somecode',
				type: 'totp',
				token: 'sometoken',
			});

		const { data, ...rest } = response.body;

		expect(response.status).toBe(200);
		expect(rest).toMatchObject({
			message: 'Sign-in successful.',
			success: true,
			errors: expect.any(Array),
			timestamp: expect.any(String),
		});
		expect(data).toMatchObject({
			access_token: expect.stringMatching(/^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+$/),
			refresh_token: expect.stringMatching(/^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+$/),
			token_type: 'bearer',
			expires: expect.any(Number),
		});
	});
});
