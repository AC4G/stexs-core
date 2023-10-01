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
import { testErrorMessages } from '../../app/services/messageBuilderService';

jest.mock('../../app/database', () => { 
    return {
        __esModule: true,
        default: {
            query: mockQuery
        }
    }
});

describe('OAuth2 Token', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

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

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ info: INVALID_REFRESH_TOKEN }]));
    });

    it('should handle token route with grant type client credentials without client secret and client id', async () => {
        const response = await request(server)
            .post('/oauth2/token')
            .send({ grant_type: 'client_credentials' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([
            { 
                info: CLIENT_ID_REQUIRED, 
                data: {
                    location: 'body',
                    path: 'client_id'
                } 
            },
            {
                info: CLIENT_SECRET_REQUIRED,
                data: {
                    location: 'body',
                    path: 'client_secret'
                }
            }
        ]));
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
        expect(response.body).toEqual(testErrorMessages([{ info: INVALID_CLIENT_CREDENTIALS }]));
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
        expect(response.body).toEqual(testErrorMessages([{ info: NO_CLIENT_SCOPES_SELECTED }]));
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
        expect(response.body).toEqual(testErrorMessages([{ 
            info: REFRESH_TOKEN_REQUIRED, 
            data: {
                location: 'body',
                path: 'refresh_token'
            } 
        }]));
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
        expect(response.body).toEqual(testErrorMessages([{ 
            info: INVALID_TOKEN, 
            data: {
                location: 'body',
                path: 'refresh_token'
            } 
        }]));
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
        expect(response.body).toEqual(testErrorMessages([{ 
            info: {
                code: INVALID_GRANT_TYPE.code,
                message: INVALID_GRANT_TYPE.messages[0]
            }, 
            data: {
                location: 'body',
                path: 'refresh_token'
            } 
        }]));
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
