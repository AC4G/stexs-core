const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { 
    EMAIL_REQUIRED,
    INVALID_EMAIL,
    INVALID_INPUT_DATA,
    INVALID_PASSWORD,
    INVALID_USERNAME,
    PASSWORD_REQUIRED,
    USERNAME_REQUIRED 
} from '../../app/constants/errors';

jest.mock('../../app/database', () => {
    return {
        __esModule: true,
        default: {
            query: mockQuery
        }
    }
});

describe('Sign Up', () => {
    it('should handle sign up with missing username', async () => {
        const response = await request(server)
            .post('/sign-up')
            .send({
                email: 'text@example.com',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: USERNAME_REQUIRED.code,
                message: USERNAME_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    path: 'username',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle sign up with username longer then 20 characters', async () => {
        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'ZaZlZeBu1mFOqDuultl1P',
                email: 'text@example.com',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_USERNAME.code,
                message: INVALID_USERNAME.messages[0],
                timestamp: expect.any(String),
                data: {
                    path: 'username',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle sign up with username as email', async () => {
        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'test@example.com',
                email: 'text@example.com',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_USERNAME.code,
                message: INVALID_USERNAME.messages[1],
                timestamp: expect.any(String),
                data: {
                    path: 'username',
                    location: 'body'
                }
            }
        ]);
    });
    
    it('should handle sign up with missing email', async () => {
        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'Test123',
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
    
    it('should handle sign up with invalid email', async () => {
        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'Test123',
                email: 'test@example',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_EMAIL.code,
                message: INVALID_EMAIL.message,
                timestamp: expect.any(String),
                data: {
                    path: 'email',
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle sign up with missing password', async () => {
        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'Test123',
                email: 'test@example.com'
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

    it('should handle sign up with invalid password according to regex specification', async () => {
        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'Test123',
                email: 'test@example.com',
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

    it('should handle sign up with already existing username', async () => {
        mockQuery.mockRejectedValue({ hint: 'Please choose a different username' });

        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'Test123',
                email: 'test@example.com',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_INPUT_DATA.code,
                message: 'Please choose a different username.',
                timestamp: expect.any(String),
                data: {
                    path: "username",
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle sign up with already existing email', async () => {
        mockQuery.mockRejectedValue({ hint: 'Please choose a different email' });

        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'Test123',
                email: 'test@example.com',
                password: 'Test123.'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_INPUT_DATA.code,
                message: 'Please choose a different email.',
                timestamp: expect.any(String),
                data: {
                    path: "email",
                    location: 'body'
                }
            }
        ]);
    });

    it('should handle sign up', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
              {
                id: 1
              }
            ],
            rowCount: 1
        });

        const email = 'test@example.com';

        const response = await request(server)
            .post('/sign-up')
            .send({
                username: 'Test123',
                email,
                password: 'Test123.'
        });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            success: true,
            message: 'Sign-up successful. Check your email for an verification link!',
            timestamp: expect.any(String),
            data: {
                output: {
                    userId: 1
                }
            }
        });
    });
});
