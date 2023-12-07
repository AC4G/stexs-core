import { expect, jest, describe, afterEach, it } from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../src/server';
import { NextFunction } from 'express';
import {
  CLIENT_ID_REQUIRED,
  CONNECTION_ALREADY_DELETED,
  CONNECTION_ALREADY_REVOKED,
  INVALID_UUID,
  REFRESH_TOKEN_REQUIRED,
} from 'utils-ts/errors';
import { message, testErrorMessages } from 'utils-ts/messageBuilder';

jest.mock('utils-ts/jwtMiddleware', () => ({
  validateAccessToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  validateRefreshToken: (req: Request, res: Response, next: NextFunction) =>
    next(),
  validateSignInConfirmOrAccessToken: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => next(),
  checkTokenGrantType: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  validateSignInConfirmToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  transformJwtErrorMessages: jest.fn((err, req, res, next: any) => next()),
}));

jest.mock('../../src/database', () => {
  return {
    __esModule: true,
    default: {
      query: mockQuery,
    },
  };
});

describe('OAuth2 Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle connections', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          organization: {
            id: 1,
            name: 'TestOrganization',
            display_name: null,
          },
          description: null,
          homepage_url: 'example.com/Test1',
          client_id: 1,
        },
        {
          organization: {
            id: 1,
            name: 'TestOrganization',
            display_name: null,
          },
          description: 'Test',
          homepage_url: 'example.com/Test2',
          client_id: 2,
        },
      ],
      rowCount: 2,
    } as never);

    const response = await request(server).get('/oauth2/connections');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        organization: {
          id: 1,
          name: 'TestOrganization',
          display_name: null,
        },
        description: null,
        homepage_url: 'example.com/Test1',
        client_id: 1,
      },
      {
        organization: {
          id: 1,
          name: 'TestOrganization',
          display_name: null,
        },
        description: 'Test',
        homepage_url: 'example.com/Test2',
        client_id: 2,
      },
    ]);
  });

  it('should handle delete connection without client id', async () => {
    const response = await request(server).delete('/oauth2/connection');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: CLIENT_ID_REQUIRED,
            data: {
              location: 'body',
              path: 'client_id',
            },
          },
        ],
        expect,
      ),
    );
  });

  it('should handle delete connection with client id not as uuid', async () => {
    const response = await request(server)
      .delete('/oauth2/connection')
      .send({ client_id: 'not-uuid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: INVALID_UUID,
            data: {
              location: 'body',
              path: 'client_id',
            },
          },
        ],
        expect,
      ),
    );
  });

  it('should handle delete connection without a connection with given client id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .delete('/oauth2/connection')
      .send({ client_id: '2abb2007-8cc2-4880-a9e1-8d0e385ef6e7' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      testErrorMessages([{ info: CONNECTION_ALREADY_DELETED }], expect),
    );
  });

  it('should handle delete connection', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .delete('/oauth2/connection')
      .send({ client_id: '2abb2007-8cc2-4880-a9e1-8d0e385ef6e7' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Connection successfully deleted.').onTest(),
    );
  });

  it('should handle connection revoking without refresh token', async () => {
    const response = await request(server).delete('/oauth2/revoke');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: REFRESH_TOKEN_REQUIRED,
            data: {
              location: 'body',
              path: 'refresh_token',
            },
          },
        ],
        expect,
      ),
    );
  });

  it('should handle connection revoking with already revoked connection', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .delete('/oauth2/revoke')
      .send({ refresh_token: 'valid-token' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      testErrorMessages([{ info: CONNECTION_ALREADY_REVOKED }], expect),
    );
  });

  it('should successfully revoke a connection with a valid refresh token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .delete('/oauth2/revoke')
      .send({ refresh_token: 'valid-token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Connection successfully revoked.').onTest(),
    );
  });
});
