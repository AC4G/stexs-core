import {
	expect,
	jest,
	describe,
	it
} from '@jest/globals';

const mockQuery = jest.fn();

import { NextFunction } from 'express';
import request from 'supertest';
import server from '../../../src/server';
import { getTOTPForVerification } from '../../../src/utils/totp';

jest.mock('../../../src/utils/mfa', () => {
	return {
		mfaValidationMiddleware: jest.fn(
			() => (req: Request, res: Response, next: NextFunction) => next(),
		),
	};
});

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

describe('Sign Out Routes', () => {
	it('should handle sign out with already signed out session', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/sign-out');

		expect(response.status).toBe(404);
	});

	it('should handle sign out of one session', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/sign-out');

		expect(response.status).toBe(204);
	});

	it('should handle sign out with already signed out sessions', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/sign-out');

		expect(response.status).toBe(404);
	});

	it('should handle sign out from all devices', async () => {
		const code = getTOTPForVerification(
			'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
		).generate();

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
				},
				{
					id: 2,
				},
			],
			rowCount: 2,
		} as never);

		const response = await request(server)
			.post('/auth/sign-out/all-sessions')
			.send({
				code,
				type: 'totp',
			});

		expect(response.status).toBe(204);
	});
});
