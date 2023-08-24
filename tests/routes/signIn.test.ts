const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { EMAIL_NOT_VERIFIED, IDENTIFIER_REQUIRED, INVALID_CREDENTIALS, PASSWORD_REQUIRED } from '../../app/constants/errors';

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

    it('should handle sign in', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    email_verified_at: '2023-08-21T12:34:56Z'
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
});
