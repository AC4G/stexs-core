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
import { INVALID_TOKEN } from 'utils-node/errors';
import { message } from 'utils-node/messageBuilder';
import { advanceTo, clear } from 'jest-date-mock';

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

	it('should handle refresh with already signed out session', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/token')
			.send({ refresh_token: 'token' });

		expect(response.status).toBe(401);
		expect(response.body).toEqual(
			message('Invalid refresh token.', {}, [
				{
					info: INVALID_TOKEN,
					data: {
						location: 'body',
						path: 'refresh_token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle refresh', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/token')
			.send({ refresh_token: 'token' });

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
});
