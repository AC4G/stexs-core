const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { advanceTo, clear } from 'jest-date-mock';
import { 
    CLIENT_ID_REQUIRED, 
    CLIENT_SECRET_REQUIRED, 
    INVALID_CLIENT_CREDENTIALS, 
    INVALID_GRANT_TYPE, 
    INVALID_REFRESH_TOKEN, 
    INVALID_TOKEN, 
    NO_CLIENT_SCOPES_SELECTED, 
    REFRESH_TOKEN_REQUIRED, 
} from '../../app/constants/errors';
import { sign } from 'jsonwebtoken';
import { 
    AUDIENCE, 
    ISSUER, 
    REFRESH_TOKEN_SECRET 
} from '../../env-config';

jest.mock('../../app/database', () => { 
    return {
        __esModule: true,
        default: {
            query: mockQuery
        }
    }
});

describe('OAuth2 Token', () => {
    beforeAll(() => {
        advanceTo(new Date('2023-09-15T12:00:00'));
    });

    afterAll(() => {
        clear();
    });

    it('should handle token route with grant type refresh token with not stored refresh token', async () => {             
        const refreshToken = sign({grant_type: "authorization_code"}, REFRESH_TOKEN_SECRET, {
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithm: 'HS256' 
        }); 

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });
        
        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            });

        console.log({ response: response.body })

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_REFRESH_TOKEN.code,
                message: INVALID_REFRESH_TOKEN.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle token route with grant type client credentials without client secret and client id', async () => {
        const response = await request(server)
            .post('/oauth2/token')
            .send({ grant_type: 'client_credentials' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: CLIENT_ID_REQUIRED.code,
                message: CLIENT_ID_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'client_id'
                }
            },
            {
                code: CLIENT_SECRET_REQUIRED.code,
                message: CLIENT_SECRET_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'client_secret'
                }
            }
        ]);
    });

    it('should handle token route with grant type client credentials with invalid credentials', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });
        
        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'client_credentials',
                client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
                client_secret: 'secret'
            });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_CLIENT_CREDENTIALS.code,
                message: INVALID_CLIENT_CREDENTIALS.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle token route with grant type client credentials with no scopes selected', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    scopes: []
                }
            ],
            rowCount: 1
        });
        
        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'client_credentials',
                client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
                client_secret: 'secret'
            });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: NO_CLIENT_SCOPES_SELECTED.code,
                message: NO_CLIENT_SCOPES_SELECTED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle token route with grant type as client credentials', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    scopes: ['inventory.read']
                }
            ],
            rowCount: 1
        });
        
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'client_credentials',
                client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
                client_secret: 'secret'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            access_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            token_type: 'bearer',
            expires: expect.any(Number)
        }); 
    });

    it('should handle token route with grant type refresh token without refresh token', async () => {
        const response = await request(server)
            .post('/oauth2/token')
            .send({ grant_type: 'refresh_token' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: REFRESH_TOKEN_REQUIRED.code,
                message: REFRESH_TOKEN_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'refresh_token'
                }
            }
        ]);
    });

    it('should handle token route with grant type refresh token with invalid refresh token', async () => {
        const refreshToken = sign({ grant_type: "authorization_code" }, 'invalid-secret', {
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithm: 'HS256' 
        });
        
        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_TOKEN.code,
                message: INVALID_TOKEN.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'refresh_token'
                }
            }
        ]);
    });

    it('should handle token route with grant type refresh token with invalid grant type inside refresh token', async () => {
        const refreshToken = sign({grant_type: "sign_in"}, REFRESH_TOKEN_SECRET, {
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithm: 'HS256' 
        }); 
        
        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_GRANT_TYPE.code,
                message: INVALID_GRANT_TYPE.messages[0],
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'refresh_token'
                }
            }
        ]);
    });

    it('should handle token route with grant type refresh token', async () => {
        const refreshToken = sign({grant_type: "authorization_code"}, REFRESH_TOKEN_SECRET, {
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithm: 'HS256' 
        }); 

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });
        
        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            });
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            access_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            refresh_token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
            token_type: 'bearer',
            expires: expect.any(Number)
        }); 
    });
});
