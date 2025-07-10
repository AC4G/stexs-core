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
import { NextFunction } from 'express';
import {
	CONNECTION_ALREADY_REVOKED,
	CONNECTION_ID_NOT_NUMERIC,
	CONNECTION_NOT_FOUND,
	FIELD_MUST_BE_A_STRING,
	REFRESH_TOKEN_REQUIRED,
} from 'utils-node/errors';
import { message } from '../../../src/utils/messageBuilder';
import { advanceTo, clear } from 'jest-date-mock';

jest.mock('../../../src/middlewares/jwtMiddleware', () => {
	return {
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

describe('OAuth2 Routes', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	beforeAll(() => {
		advanceTo(new Date('2023-09-15T12:00:00'));
	});

	afterAll(() => {
		clear();
	});

	it('should handle delete connection with connection id not as numeric', async () => {
		const response = await request(server)
			.delete(`/auth/oauth2/connections/${'not_a_number'}`);

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CONNECTION_ID_NOT_NUMERIC,
					data: {
						location: 'params',
						path: 'connectionId',
					},
				},
			]).onTest(),
		);
	});

	it('should handle delete connection without a connection with given client id', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.delete(`/auth/oauth2/connections/${1}`);

		expect(response.status).toBe(404);
		expect(response.body).toEqual(
			message('Connection not found.', {}, [
				{ info: CONNECTION_NOT_FOUND }
			]).onTest(),
		);
	});

	it('should handle delete connection', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.delete(`/auth/oauth2/connections/${1}`);

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Connection successfully deleted.').onTest(),
		);
	});

	it('should handle connection revoking without refresh token', async () => {
		const response = await request(server)
			.delete('/auth/oauth2/revoke');

		const data = {
			location: 'body',
			path: 'refresh_token',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: REFRESH_TOKEN_REQUIRED,
					data,
				},
				{
					info: FIELD_MUST_BE_A_STRING,
					data,
				},
			]).onTest(),
		);
	});

	it('should handle connection revoking with already revoked connection', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.delete('/auth/oauth2/revoke')
			.send({ refresh_token: 'valid-token' });

		expect(response.status).toBe(404);
		expect(response.body).toEqual(
			message('Connection not found.', {}, [
				{ info: CONNECTION_ALREADY_REVOKED }
			]).onTest(),
		);
	});

	it('should successfully revoke a connection with a valid refresh token', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.delete('/auth/oauth2/revoke')
			.send({ refresh_token: 'valid-token' });

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Connection successfully revoked.').onTest(),
		);
	});
});
