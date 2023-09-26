const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { 
    CODE_REQUIRED,
    EMAIL_NOT_VERIFIED, 
    IDENTIFIER_REQUIRED, 
    INVALID_CODE, 
    INVALID_CREDENTIALS, 
    INVALID_TYPE, 
    PASSWORD_REQUIRED, 
    TOKEN_REQUIRED, 
    TYPE_REQUIRED
} from '../../app/constants/errors';
import { NextFunction } from 'express';

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
    it('should handle sign in without identifier', async () => {
        const response = await request(server)
            .post('/sign-in')
            .send({ password: 'Test123.' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: IDENTIFIER_REQUIRED.code,
                message: IDENTIFIER_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    path: 'identifier',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle sign in without password', async () => {
        const response = await request(server)
            .post('/sign-in')
            .send({ identifier: 'test' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: PASSWORD_REQUIRED.code,
                message: PASSWORD_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    path: 'password',
                    location: 'body'
                }
            }
        ]);
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
        expect(response.body.errors).toEqual([
            {
                code: INVALID_CREDENTIALS.code,
                message: INVALID_CREDENTIALS.messages[0],
                timestamp: expect.any(String),
                data: {}
            }
        ]);
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
        expect(response.body.errors).toEqual([
            {
                code: EMAIL_NOT_VERIFIED.code,
                message: EMAIL_NOT_VERIFIED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
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
        expect(response.body).toMatchObject({
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
        expect(response.body).toMatchObject({
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
        expect(response.body).toMatchObject({
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
        expect(response.body.errors).toEqual([
            {
                code: CODE_REQUIRED.code,
                message: CODE_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'code'
                }
            }
        ]);
    });

    it('should handle sign in confirm without type', async () => {
        const response = await request(server)
            .post('/sign-in/confirm')
            .send({ 
                code: 'code',
                token: 'token'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TYPE_REQUIRED.code,
                message: TYPE_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'type'
                }
            }
        ]);
    });

    it('should handle sign in confirm without token', async () => {
        const response = await request(server)
            .post('/sign-in/confirm')
            .send({ 
                code: 'code',
                type: 'totp'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TOKEN_REQUIRED.code,
                message: TOKEN_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'token'
                }
            }
        ]);
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
        expect(response.body.errors).toEqual([
            {
                code: INVALID_TYPE.code,
                message: INVALID_TYPE.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'type'
                }
            }
        ]);
    });
});
