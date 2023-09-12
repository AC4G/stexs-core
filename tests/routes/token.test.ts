const mockQuery = jest.fn();

import { NextFunction } from 'express';
import request from 'supertest';
import server from '../../app/server';
import { INVALID_TOKEN } from "../../app/constants/errors";

jest.mock('../../app/middlewares/jwtMiddleware', () => ({
    validateAccessToken: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    validateRefreshToken: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    checkTokenGrantType: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    transformJwtErrorMessages: jest.fn((err, req, res, next) => next())
}));

jest.mock('../../app/database', () => {
    return {
        __esModule: true,
        default: {
            query: mockQuery
        }
    }
});

describe('Token Route', () => {
    it('should handle refresh with already signed out session', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/token');

        expect(response.status).toBe(401);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_TOKEN.code,
                message: INVALID_TOKEN.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle refresh', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/token');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            access_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            refresh_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            token_type: 'bearer',
            expires: expect.any(Number)
        }); 
    });
});
