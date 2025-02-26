import {
	expect,
	jest,
	describe,
	afterEach,
	it,
	beforeAll,
	afterAll
} from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../../src/server';
import {
	CODE_REQUIRED,
	EMAIL_NOT_VERIFIED,
	IDENTIFIER_REQUIRED,
	INVALID_CREDENTIALS,
	INVALID_TYPE,
	PASSWORD_REQUIRED,
	TOKEN_REQUIRED,
	TYPE_REQUIRED,
	USER_NOT_FOUND,
} from 'utils-node/errors';
import { NextFunction } from 'express';
import { message } from 'utils-node/messageBuilder';
import { advanceTo, clear } from 'jest-date-mock';
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

describe('Sign In Route', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	beforeAll(() => {
		advanceTo(new Date('2023-09-15T12:00:00'));
	});

	afterAll(() => {
		clear();
	});

	it('should handle sign in without identifier', async () => {
		const response = await request(server)
			.post('/auth/sign-in')
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
			.post('/auth/sign-in')
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
			.post('/auth/sign-in')
			.send({
				identifier: 'test',
				password: 'Test123.',
			});

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
			.post('/auth/sign-in')
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
			.post('/auth/sign-in')
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
			.post('/auth/sign-in')
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

	it('should handle sign in confirm without code', async () => {
		const response = await request(server)
			.post('/auth/sign-in/confirm')
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

	it('should handle sign in confirm without type', async () => {
		const response = await request(server)
			.post('/auth/sign-in/confirm')
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

	it('should handle sign in confirm without token', async () => {
		const response = await request(server)
			.post('/auth/sign-in/confirm')
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

	it('should handle sign in confirm with unsupported type', async () => {
		const response = await request(server)
			.post('/auth/sign-in/confirm')
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
});
