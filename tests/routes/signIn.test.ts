const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { 
    CODE_REQUIRED,
    EMAIL_NOT_VERIFIED, 
    IDENTIFIER_REQUIRED, 
    INVALID_CREDENTIALS, 
    INVALID_TYPE, 
    PASSWORD_REQUIRED, 
    TOKEN_REQUIRED, 
    TYPE_REQUIRED
} from '../../app/constants/errors';
import { NextFunction } from 'express';
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

describe('Sign In Route', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle sign in without identifier', async () => {
        const response = await request(server)
            .post('/sign-in')
            .send({ password: 'Test123.' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: IDENTIFIER_REQUIRED, 
            data: {
                location: 'body',
                path: 'identifier'
            } 
        }]));
    });

    it('should handle sign in without password', async () => {
        const response = await request(server)
            .post('/sign-in')
            .send({ identifier: 'test' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: PASSWORD_REQUIRED, 
            data: {
                location: 'body',
                path: 'password'
            } 
        }]));
    });

    it('should handle sign in with invalid credentials', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/sign-in')
            .send({ 
                identifier: 'test',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ info: {
            code: INVALID_CREDENTIALS.code,
            message: INVALID_CREDENTIALS.messages[0]
        } }]));
    });

    it('should handle sign in without verified email', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email_verified_at: null
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/sign-in')
            .send({ 
                identifier: 'test',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ info: EMAIL_NOT_VERIFIED }]));
    });

    it('should handle sign in without 2fa', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    email_verified_at: '2023-08-21T12:34:56Z',
                    types: []
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/sign-in')
            .send({ 
                identifier: 'test',
                password: 'Test123.'
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            access_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            refresh_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            token_type: 'bearer',
            expires: expect.any(Number)
        }); 
    });

    it('should handle sign in initialization with email 2fa', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    email_verified_at: '2023-08-21T12:34:56Z',
                    types: ['email']
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/sign-in')
            .send({ 
                identifier: 'test',
                password: 'Test123.'
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            types: ['email'],
            expires: expect.any(Number)
        }); 
    });

    it('should handle sign in initialization with totp 2fa', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    email_verified_at: '2023-08-21T12:34:56Z',
                    types: ['totp']
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/sign-in')
            .send({ 
                identifier: 'test',
                password: 'Test123.'
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            types: ['totp'],
            expires: expect.any(Number)
        }); 
    });

    it('should handle sign in confirm without code', async () => {
        const response = await request(server)
            .post('/sign-in/confirm')
            .send({ 
                type: 'totp',
                token: 'token'
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: CODE_REQUIRED, 
            data: {
                location: 'body',
                path: 'code'
            } 
        }]));
    });

    it('should handle sign in confirm without type', async () => {
        const response = await request(server)
            .post('/sign-in/confirm')
            .send({ 
                code: 'code',
                token: 'token'
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: TYPE_REQUIRED, 
            data: {
                location: 'body',
                path: 'type'
            } 
        }]));
    });

    it('should handle sign in confirm without token', async () => {
        const response = await request(server)
            .post('/sign-in/confirm')
            .send({ 
                code: 'code',
                type: 'totp'
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: TOKEN_REQUIRED, 
            data: {
                location: 'body',
                path: 'token'
            } 
        }]));
    });

    it('should handle sign in confirm with unsupported type', async () => {
        const response = await request(server)
            .post('/sign-in/confirm')
            .send({ 
                code: 'code',
                type: 'sms',
                token: 'token'
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: INVALID_TYPE, 
            data: {
                location: 'body',
                path: 'type'
            } 
        }]));
    });
});
