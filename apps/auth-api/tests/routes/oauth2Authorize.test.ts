import {
  expect,
  jest,
  describe,
  afterEach,
  beforeAll,
  afterAll,
  it,
} from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../src/server';
import { NextFunction } from 'express';
import { advanceTo, clear } from 'jest-date-mock';
import {
  ARRAY_REQUIRED,
  CLIENT_ALREADY_CONNECTED,
  CLIENT_ID_REQUIRED,
  CLIENT_NOT_FOUND,
  EMPTY_ARRAY,
  INVALID_URL,
  INVALID_UUID,
  REDIRECT_URL_REQUIRED,
  SCOPES_REQUIRED,
} from 'utils-node/errors';
import { testErrorMessages } from 'utils-node/messageBuilder';

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
        scopes: ['inventory.read'],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CLIENT_ID_REQUIRED,
          data: {
            location: 'body',
            path: 'client_id',
          },
        },
      ]),
    );
  });

  it('should handle authorize with invalid uuid', async () => {
    const response = await request(server)
      .post('/oauth2/authorize')
      .send({
        client_id: 'invalid-uuid',
        redirect_url: 'https://example.com',
        scopes: ['inventory.read'],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_UUID,
          data: {
            location: 'body',
            path: 'client_id',
          },
        },
      ]),
    );
  });

  it('should handle authorize without redirect url', async () => {
    const response = await request(server)
      .post('/oauth2/authorize')
      .send({
        client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
        scopes: ['inventory.read'],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: REDIRECT_URL_REQUIRED,
          data: {
            location: 'body',
            path: 'redirect_url',
          },
        },
      ]),
    );
  });

  it('should handle authorize with redirect url as not url', async () => {
    const response = await request(server)
      .post('/oauth2/authorize')
      .send({
        client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
        redirect_url: 'not-url',
        scopes: ['inventory.read'],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_URL,
          data: {
            location: 'body',
            path: 'redirect_url',
          },
        },
      ]),
    );
  });

  it('should handle authorize without scopes', async () => {
    const response = await request(server).post('/oauth2/authorize').send({
      client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
      redirect_url: 'https://example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: SCOPES_REQUIRED,
          data: {
            location: 'body',
            path: 'scopes',
          },
        },
      ]),
    );
  });

  it('should handle authorize with scopes as string', async () => {
    const response = await request(server).post('/oauth2/authorize').send({
      client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
      redirect_url: 'https://example.com',
      scopes: 'scopes',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: ARRAY_REQUIRED,
          data: {
            location: 'body',
            path: 'scopes',
          },
        },
      ]),
    );
  });

  it('should handle authorize with empty scopes array', async () => {
    const response = await request(server).post('/oauth2/authorize').send({
      client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
      redirect_url: 'https://example.com',
      scopes: [],
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: EMPTY_ARRAY,
          data: {
            location: 'body',
            path: 'scopes',
          },
        },
      ]),
    );
  });

  it('should handle authorize with invalid client id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .post('/oauth2/authorize')
      .send({
        client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
        redirect_url: 'https://example.com',
        scopes: ['inventory.read'],
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CLIENT_NOT_FOUND,
          data: {
            location: 'body',
            paths: ['client_id', 'redirect_url', 'scopes'],
          },
        },
      ]),
    );
  });

  it('should handle authorize with already connected client', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/oauth2/authorize')
      .send({
        client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
        redirect_url: 'https://example.com',
        scopes: ['inventory.read'],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: CLIENT_ALREADY_CONNECTED }]),
    );
  });

  it('should handle authorize', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/oauth2/authorize')
      .send({
        client_id: '67054312-b0bf-4c99-a4a8-565988d4c2dd',
        redirect_url: 'https://example.com',
        scopes: ['inventory.read'],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: expect.stringMatching(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      ),
    });
  });
});
