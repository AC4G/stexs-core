const mockQuery = jest.fn();

import { NextFunction } from 'express';
import request from 'supertest';
import server from '../../app/server';

jest.mock('../../app/middlewares/jwtMiddleware', () => ({
	validateAccessToken: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
	validateRefreshToken: (req: Request, res: Response, next: NextFunction) => next(),
	validateSignInConfirmOrAccessToken: (req: Request, res: Response, next: NextFunction) => next(),
	checkTokenGrantType: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
	validateSignInConfirmToken: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
	transformJwtErrorMessages: jest.fn((err, req, res, next) => next())
}));

jest.mock('../../app/database', () => {
	return {
		__esModule: true,
		default: {
			query: mockQuery
		}
	};
});

describe('Sign Out Routes', () => {
	it('should handle sign out with already signed out session', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0
		});

		const response = await request(server)
			.post('/sign-out');

		expect(response.status).toBe(404);
	});

	it('should handle sign out of one session', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1
				}
			],
			rowCount: 1
		});

		const response = await request(server)
			.post('/sign-out');

		expect(response.status).toBe(204);
	});

	it('should handle sign out with already signed out sessions', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0
		});

		const response = await request(server)
			.post('/sign-out/everywhere');

		expect(response.status).toBe(404);
	});

	it('should handle sign out from all devices', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1
				},
				{
					id: 2
				}
			],
			rowCount: 2
		});

		const response = await request(server)
			.post('/sign-out');

		expect(response.status).toBe(204);
	});
}); 
