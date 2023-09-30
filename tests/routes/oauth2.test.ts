const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { NextFunction } from 'express';
import { 
    CLIENT_ID_REQUIRED, 
    CONNECTION_ALREADY_DELETED, 
    CONNECTION_ALREADY_REVOKED, 
    INVALID_UUID, 
    REFRESH_TOKEN_REQUIRED
} from '../../app/constants/errors';

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

describe('OAuth2 Routes', () => {
    it('should handle connections', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    organization: {
                        id: 1,
                        name: 'TestOrganization',
                        display_name: null
                    },
                    description: null,
                    homepage_url: 'example.com/Test1',
                    client_id: 1
                },
                {
                    organization: {
                        id: 1,
                        name: 'TestOrganization',
                        display_name: null
                    },
                    description: 'Test',
                    homepage_url: 'example.com/Test2',
                    client_id: 2
                }
            ],
            rowCount: 2
        });

        const response = await request(server)
            .get('/oauth2/connections');

        console.log({ body: response.body })
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            {
                organization: {
                    id: 1,
                    name: 'TestOrganization',
                    display_name: null
                },
                description: null,
                homepage_url: 'example.com/Test1',
                client_id: 1
            },
            {
                organization: {
                    id: 1,
                    name: 'TestOrganization',
                    display_name: null
                },
                description: 'Test',
                homepage_url: 'example.com/Test2',
                client_id: 2
            }
        ]);
    });

    it('should handle delete connection without client id', async () => {
        const response = await request(server)
            .delete('/oauth2/connection');

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
            }
        ]);
    });

    it('should handle delete connection with client id not as uuid', async () => {
        const response = await request(server)
            .delete('/oauth2/connection')
            .send({ client_id: 'not-uuid' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_UUID.code,
                message: INVALID_UUID.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'client_id'
                }
            }
        ]);
    });

    it('should handle delete connection without a connection with given client id', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });
        
        const response = await request(server)
            .delete('/oauth2/connection')
            .send({ client_id: '2abb2007-8cc2-4880-a9e1-8d0e385ef6e7' });

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual([
            {
                code: CONNECTION_ALREADY_DELETED.code,
                message: CONNECTION_ALREADY_DELETED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle delete connection', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });
        
        const response = await request(server)
            .delete('/oauth2/connection')
            .send({ client_id: '2abb2007-8cc2-4880-a9e1-8d0e385ef6e7' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Connection successfully deleted.',
            timestamp: expect.any(String),
            data: {}
        }); 
    });

    it('should handle connection revoking without refresh token', async () => {
        const response = await request(server)
            .delete('/oauth2/revoke');

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

    it('should handle connection revoking with already revoked connection', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 0
        });
        
        const response = await request(server)
            .delete('/oauth2/revoke')
            .send({ refresh_token: 'valid-token' });

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual([
            {
                code: CONNECTION_ALREADY_REVOKED.code,
                message: CONNECTION_ALREADY_REVOKED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle connection revoking', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });
        
        const response = await request(server)
            .delete('/oauth2/revoke')
            .send({ refresh_token: 'valid-token' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Connection successfully revoked.',
            timestamp: expect.any(String),
            data: {}
        });
    });
});
