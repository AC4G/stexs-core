const mockQuery = jest.fn();

import { NextFunction } from 'express';
import request from 'supertest';
import server from '../../app/server';
import { INVALID_TOKEN } from "../../app/constants/errors";
import { testErrorMessages } from '../../app/services/messageBuilderService';

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
    }
});

describe('Token Route', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle refresh with already signed out session', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/token')
            .send({ refresh_token: 'token' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: INVALID_TOKEN,
            data: {
                location: 'body',
                path: 'refresh_token'
            }
        }]));
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
            .post('/token')
            .send({ refresh_token: 'token' });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            access_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            refresh_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            token_type: 'bearer',
            expires: expect.any(Number)
        }); 
    });
});
