import { expect, jest, describe, afterEach, it } from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../src/server';
import { NextFunction } from 'express';
import {
  CONNECTION_ALREADY_REVOKED,
  CONNECTION_ID_NOT_NUMERIC,
  CONNECTION_ID_REQUIRED,
  CONNECTION_NOT_FOUND,
  REFRESH_TOKEN_REQUIRED,
} from 'utils-node/errors';
import { message, testErrorMessages } from 'utils-node/messageBuilder';

jest.mock('utils-node/jwtMiddleware', () => ({
  validateAccessToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  validateRefreshToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  validateSignInConfirmOrAccessToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  checkTokenGrantType: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  validateSignInConfirmToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  transformJwtErrorMessages: jest.fn(
    () => (err: Object, req: Request, res: Response, next: NextFunction) => {},
  ),
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

  it('should handle delete connection with connection id not as numeric', async () => {
    const response = await request(server)
      .delete(`/oauth2/connections/${'not_a_number'}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CONNECTION_ID_NOT_NUMERIC,
          data: {
            location: 'params',
            path: 'connectionId',
          },
        },
      ]),
    );
  });

  it('should handle delete connection without a connection with given client id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .delete(`/oauth2/connections/${1}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      testErrorMessages([{ info: CONNECTION_NOT_FOUND }]),
    );
  });

  it('should handle delete connection', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .delete(`/oauth2/connections/${1}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Connection successfully deleted.').onTest(),
    );
  });

  it('should handle connection revoking without refresh token', async () => {
    const response = await request(server).delete('/oauth2/revoke');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: REFRESH_TOKEN_REQUIRED,
          data: {
            location: 'body',
            path: 'refresh_token',
          },
        },
      ]),
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
      testErrorMessages([{ info: CONNECTION_ALREADY_REVOKED }]),
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
