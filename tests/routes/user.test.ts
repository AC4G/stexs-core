const mockQuery = jest.fn();

import { NextFunction } from 'express';
import request from 'supertest';
import server from '../../app/server';
import { 
    EMAIL_CHANGE_LINK_EXPIRED,
    EMAIL_REQUIRED,
    INVALID_EMAIL, 
    INVALID_PASSWORD, 
    INVALID_TOKEN, 
    NEW_PASSWORD_EQUALS_CURRENT, 
    PASSWORD_REQUIRED, 
    TOKEN_REQUIRED
} from "../../app/constants/errors";
import { advanceTo, clear } from 'jest-date-mock';

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

describe('User Routes', () => {
    beforeAll(() => {
        advanceTo(new Date('2023-09-15T12:00:00'));
    });

    afterAll(() => {
        clear();
    });

    it('should handle get user data', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    email: 'test@example.com',
                    raw_user_meta_data: {},
                    created_at: 'date',
                    updated_at: 'date'
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .get('/user');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            id: 1,
            email: 'test@example.com',
            raw_user_meta_data: {},
            created_at: expect.any(String),
            updated_at: expect.any(String)
        });
    });

    it('should handle password change with missing password', async () => {
        const response = await request(server)
            .post('/user/password');

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

    it('should handle password change with invalid password according to regex specification', async () => {
        const response = await request(server)
            .post('/user/password')
            .send({ password: 'test123' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_PASSWORD.code,
                message: INVALID_PASSWORD.message,
                timestamp: expect.any(String),
                data: {
                    path: 'password',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle password with current password', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    is_current_password: true
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/user/password')
            .send({ password: 'Test123.' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: NEW_PASSWORD_EQUALS_CURRENT.code,
                message: NEW_PASSWORD_EQUALS_CURRENT.message,
                timestamp: expect.any(String),
                data: {
                    path: 'password',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle password change', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    is_current_password: false
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/user/password')
            .send({ password: 'Test123.' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Password changed successfully.',
            timestamp: expect.any(String),
            data: {}
        });
    });

    it('should handle email change with missing email', async () => {
        const response = await request(server)
            .post('/user/email');

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: EMAIL_REQUIRED.code,
                message: EMAIL_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    path: 'email',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle email change with invalid email', async () => {
        const response = await request(server)
            .post('/user/email')
            .send({ email: 'test' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_EMAIL.code,
                message: INVALID_EMAIL.messages[0],
                timestamp: expect.any(String),
                data: {
                    path: 'email',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle email change', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/user/email')
            .send({ email: 'test@example.com' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Email change verification link has been sent to the new email address.',
            timestamp: expect.any(String),
            data: {}
        });
    });

    it('should handle email change verification with missing token', async () => {
        const response = await request(server)
            .post('/user/email/verify');

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TOKEN_REQUIRED.code,
                message: TOKEN_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    path: 'token',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle email change verification with expired token', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email_change_sent_at: new Date('2023-09-14T10:00:00').toISOString()
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/user/email/verify')
            .send({ token: 'token' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: EMAIL_CHANGE_LINK_EXPIRED.code,
                message: EMAIL_CHANGE_LINK_EXPIRED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle email change verification with invalid token', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/user/email/verify')
            .send({ token: 'token' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_TOKEN.code,
                message: INVALID_TOKEN.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle email change with expired verification token', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email_change_sent_at: new Date('2023-09-14T11:00:00').toISOString()
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/user/email/verify')
            .send({ token: 'expired-token' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: EMAIL_CHANGE_LINK_EXPIRED.code,
                message: EMAIL_CHANGE_LINK_EXPIRED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    })

    it('should handle email change verification', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email_change_sent_at: new Date('2023-09-15T11:00:00').toISOString()
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/user/email/verify')
            .send({ token: 'token' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Email successfully changed.',
            timestamp: expect.any(String),
            data: {}
        });
    });
});
