const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { NextFunction } from 'express';
import { advanceTo, clear } from 'jest-date-mock';
import { 
    ARRAY_REQUIRED, 
    CLIENT_ALREADY_CONNECTED, 
    CLIENT_ID_REQUIRED, 
    CLIENT_NOT_FOUND, 
    CLIENT_SECRET_REQUIRED, 
    CODE_EXPIRED, 
    CODE_REQUIRED, 
    EMPTY_ARRAY, 
    GRANT_TYPE_REQUIRED, 
    INVALID_AUTHORIZATION_CODE, 
    INVALID_GRANT_TYPE, 
    INVALID_URL, 
    INVALID_UUID,  
    REDIRECT_URL_REQUIRED, 
    SCOPES_REQUIRED 
} from '../../app/constants/errors';
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

describe('OAuth2 Authorize', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(() => {
        advanceTo(new Date('2023-09-15T12:00:00'));
    });

    afterAll(() => {
        clear();
    });

    it('should handle authorize without client id', async () => {
        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                redirect_url: 'https://example.com',
                scopes: ['inventory.read']
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: CLIENT_ID_REQUIRED, 
            data: {
                location: 'body',
                path: 'client_id'
            } 
        }]));
    });

    it('should handle authorize with invalid uuid', async () => {
        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: 'invalid-uuid',
                redirect_url: 'https://example.com',
                scopes: ['inventory.read']
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: INVALID_UUID, 
            data: {
                location: 'body',
                path: 'client_id'
            } 
        }]));
    });

    it('should handle authorize without redirect url', async () => {
        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                scopes: ['inventory.read']
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: REDIRECT_URL_REQUIRED, 
            data: {
                location: 'body',
                path: 'redirect_url'
            } 
        }]));
    });

    it('should handle authorize with redirect url as not url', async () => {
        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                redirect_url: 'not-url',
                scopes: ['inventory.read']
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info: INVALID_URL, 
            data: {
                location: 'body',
                path: 'redirect_url'
            } 
        }]));
    });

    it('should handle authorize without scopes', async () => {
        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                redirect_url: 'https://example.com'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info:  SCOPES_REQUIRED, 
            data: {
                location: 'body',
                path: 'scopes'
            } 
        }]));
    });

    it('should handle authorize with scopes as string', async () => {
        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                redirect_url: 'https://example.com',
                scopes: 'scopes'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info:  ARRAY_REQUIRED, 
            data: {
                location: 'body',
                path: 'scopes'
            } 
        }]));
    });

    it('should handle authorize with empty scopes array', async () => {
        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                redirect_url: 'https://example.com',
                scopes: []
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info:  EMPTY_ARRAY, 
            data: {
                location: 'body',
                path: 'scopes'
            } 
        }]));
    });

    it('should handle authorize with invalid client id', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                redirect_url: 'https://example.com',
                scopes: ['inventory.read']
            });
        
        expect(response.status).toBe(404);
        expect(response.body).toEqual(testErrorMessages([{ info: CLIENT_NOT_FOUND }]));
    });

    it('should handle authorize with already connected client', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                redirect_url: 'https://example.com',
                scopes: ['inventory.read']
            });
        
        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ info: CLIENT_ALREADY_CONNECTED }]));
    });

    it('should handle authorize', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/oauth2/authorize')
            .send({ 
                client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
                redirect_url: 'https://example.com',
                scopes: ['inventory.read']
            });
        
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            code: expect.stringMatching(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        });
    });

    it('should handle token route without grant type', async () => {
        const response = await request(server)
            .post('/oauth2/token');

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info:  GRANT_TYPE_REQUIRED, 
            data: {
                location: 'body',
                path: 'grant_type'
            } 
        }]));
    });

    it('should handle token route with invalid grant type', async () => {
        const response = await request(server)
            .post('/oauth2/token')
            .send({ grant_type: 'password' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info:  {
                code: INVALID_GRANT_TYPE.code,
                message: INVALID_GRANT_TYPE.messages[1]
            }, 
            data: {
                location: 'body',
                path: 'grant_type'
            } 
        }]));
    });

    it('should handle token route with authorization code without client id, client secret and code', async () => {
        const response = await request(server)
            .post('/oauth2/token')
            .send({ grant_type: 'authorization_code' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([
            { 
                info:  CLIENT_ID_REQUIRED, 
                data: {
                    location: 'body',
                    path: 'client_id'
                } 
            },
            { 
                info:  CLIENT_SECRET_REQUIRED, 
                data: {
                    location: 'body',
                    path: 'client_secret'
                } 
            },
            { 
                info:  CODE_REQUIRED, 
                data: {
                    location: 'body',
                    path: 'code'
                } 
            }
        ]));
    });

    it('should handle token route with authorization code with invalid client id format', async () => {
        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'authorization_code',
                code: 'code',
                client_id: 'id',
                client_secret: 'secret'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ 
            info:  INVALID_UUID, 
            data: {
                location: 'body',
                path: 'client_id'
            } 
        }]));
    });

    it('should handle token route with authorization code with invalid authorization code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });

        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'authorization_code',
                code: 'code',
                client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
                client_secret: 'secret'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ info: INVALID_AUTHORIZATION_CODE }]));
    });

    it('should handle token route with authorization code with expired authorization code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    user_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d99',
                    created_at: '2023-09-15T11:54:00',
                    scopes: ['inventory.read']
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/oauth2/token')
            .send({ 
                grant_type: 'authorization_code',
                code: 'code',
                client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
                client_secret: 'secret'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(testErrorMessages([{ info: CODE_EXPIRED }]));
    });

    it('should handle token route with authorization code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    user_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d99',
                    created_at: '2023-09-15T12:00:00',
                    scopes: ['inventory.read']
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
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
                grant_type: 'authorization_code',
                code: 'code',
                client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
                client_secret: 'secret'
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
