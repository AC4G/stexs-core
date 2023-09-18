const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { 
    EMAIL_REQUIRED, 
    INVALID_EMAIL, 
    INVALID_PASSWORD, 
    INVALID_REQUEST, 
    NEW_PASSWORD_EQUALS_CURRENT, 
    PASSWORD_REQUIRED, 
    RECOVERY_LINK_EXPIRED, 
    TOKEN_REQUIRED 
} from '../../app/constants/errors';
import { advanceTo, clear } from 'jest-date-mock';

jest.mock('../../app/database', () => { 
    return {
        __esModule: true,
        default: {
            query: mockQuery
        }
    }
});

describe('Recovery Routes', () => {
    beforeAll(() => {
        advanceTo(new Date('2023-09-15T12:00:00'));
    });

    afterAll(() => {
        clear();
    });

    it('should handle recovery with missing email', async () => {
        const response = await request(server)
            .post('/recovery');

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

    it('should handle recovery with invalid email', async () => {
        const response = await request(server)
            .post('/recovery')
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

    it('should handle recovery with non existing email', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/recovery')
            .send({ email: 'test@example.com' });

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

    it('should handle recovery', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    column: 1
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/recovery')
            .send({ email: 'test@example.com' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Recovery email was been send.',
            timestamp: expect.any(String),
            data: {}
        });
    });

    //confirm recovery

    it('should handle confirm recovery with missing email', async () => {
        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                token: 'token',
                password: 'Test123.'
        });

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

    it('should handle confirm recovery with invalid email', async () => {
        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                email: 'test',
                token: 'token',
                password: 'Test123.'
        });

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

    it('should handle confirm recovery with missing token', async () => {
        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                email: 'test@example.com',
                password: 'Test123.'
        });

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

    it('should handle confirm recovery with missing password', async () => {
        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                email: 'test@example.com',
                token: 'token'
        });

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

    it('should handle confirm recovery with invalid password according to regex specification', async () => {
        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                email: 'test@example.com',
                token: 'token',
                password: 'test123'
        });

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

    it('should handle confirm recovery with invalid data', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                email: 'test@example.com',
                token: 'token',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_REQUEST.code,
                message: INVALID_REQUEST.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle confirm expired recovery token', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    recovery_sent_at: new Date('2023-09-15T10:00:00').toISOString()
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                email: 'test@example.com',
                token: 'token',
                password: 'Test123.'
        });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: RECOVERY_LINK_EXPIRED.code,
                message: RECOVERY_LINK_EXPIRED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle confirm recovery with current password', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    recovery_sent_at: new Date('2023-09-15T12:00:00').toISOString()
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    is_current_password: true
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/recovery/confirm')
            .send({ 
                email: 'test@example.com',
                token: 'token',
                password: 'Test123.'
        });

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

    it('should handle confirm recovery', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    recovery_sent_at: new Date('2023-09-15T12:00:00').toISOString()
                }
            ],
            rowCount: 1
        });

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
            .post('/recovery/confirm')
            .send({ 
                email: 'test@example.com',
                token: 'token',
                password: 'Test123.'
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Password successfully recovered.',
            timestamp: expect.any(String),
            data: {}
        });
    })
});
