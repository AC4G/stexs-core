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
import { advanceTo, clear } from 'jest-date-mock';
import {
  CLIENT_ID_REQUIRED,
  CLIENT_SECRET_REQUIRED,
  CODE_EXPIRED,
  CODE_REQUIRED,
  GRANT_TYPE_REQUIRED,
  INVALID_AUTHORIZATION_CODE,
  INVALID_CLIENT_CREDENTIALS,
  INVALID_GRANT_TYPE,
  INVALID_REFRESH_TOKEN,
  INVALID_TOKEN,
  INVALID_UUID,
  NO_CLIENT_SCOPES_SELECTED,
  REFRESH_TOKEN_REQUIRED,
} from 'utils-node/errors';
import { sign } from 'jsonwebtoken';
import { AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from '../../env-config';
import { testErrorMessages } from 'utils-node/messageBuilder';

jest.mock('../../src/database', () => {
  return {
    __esModule: true,
    default: {
      query: mockQuery,
    },
  };
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
    const refreshToken = sign(
      { grant_type: 'authorization_code' },
      REFRESH_TOKEN_SECRET,
      {
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithm: 'HS256',
      },
    );

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: INVALID_REFRESH_TOKEN,
            data: {
              location: 'body',
              path: 'refresh_token',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route without grant type', async () => {
    const response = await request(server).post('/oauth2/token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: GRANT_TYPE_REQUIRED,
            data: {
              location: 'body',
              path: 'grant_type',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with invalid grant type', async () => {
    const response = await request(server)
      .post('/oauth2/token')
      .send({ grant_type: 'password' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: {
              code: INVALID_GRANT_TYPE.code,
              message: INVALID_GRANT_TYPE.messages[1],
            },
            data: {
              location: 'body',
              path: 'grant_type',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with authorization code without client id, client secret and code', async () => {
    const response = await request(server)
      .post('/oauth2/token')
      .send({ grant_type: 'authorization_code' });

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
          {
            info: CLIENT_SECRET_REQUIRED,
            data: {
              location: 'body',
              path: 'client_secret',
            },
          },
          {
            info: CODE_REQUIRED,
            data: {
              location: 'body',
              path: 'code',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with authorization code with invalid client id format', async () => {
    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'authorization_code',
      code: 'code',
      client_id: 'id',
      client_secret: 'secret',
    });

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
        ]
      ),
    );
  });

  it('should handle token route with authorization code with invalid authorization code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'authorization_code',
      code: 'code',
      client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
      client_secret: 'secret',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: INVALID_AUTHORIZATION_CODE,
            data: {
              location: 'body',
              path: 'code',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with authorization code with expired authorization code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          user_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d99',
          created_at: '2023-09-15T11:54:00',
          scopes: ['inventory.read'],
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'authorization_code',
      code: 'code',
      client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
      client_secret: 'secret',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: CODE_EXPIRED,
            data: {
              location: 'body',
              path: 'code',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with authorization code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          user_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d99',
          created_at: '2023-09-15T12:00:00',
          scopes: ['inventory.read'],
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'authorization_code',
      code: 'code',
      client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
      client_secret: 'secret',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      access_token: expect.stringMatching(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      ),
      refresh_token: expect.stringMatching(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      ),
      token_type: 'bearer',
      expires: expect.any(Number),
    });
  });

  it('should handle token route with grant type client credentials without client secret and client id', async () => {
    const response = await request(server)
      .post('/oauth2/token')
      .send({ grant_type: 'client_credentials' });

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
          {
            info: CLIENT_SECRET_REQUIRED,
            data: {
              location: 'body',
              path: 'client_secret',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with grant type client credentials with invalid credentials', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'client_credentials',
      client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
      client_secret: 'secret',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: INVALID_CLIENT_CREDENTIALS,
            data: {
              location: 'body',
              paths: ['client_id', 'client_secret'],
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with grant type client credentials with no scopes selected', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          scopes: [],
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'client_credentials',
      client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
      client_secret: 'secret',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: NO_CLIENT_SCOPES_SELECTED }]),
    );
  });

  it('should handle token route with grant type as client credentials', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          scopes: ['inventory.read'],
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'client_credentials',
      client_id: '775dc11f-bee2-4cdd-8560-1764b0fd4d07',
      client_secret: 'secret',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      access_token: expect.stringMatching(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      ),
      token_type: 'bearer',
      expires: expect.any(Number),
    });
  });

  it('should handle token route with grant type refresh token without refresh token', async () => {
    const response = await request(server)
      .post('/oauth2/token')
      .send({ grant_type: 'refresh_token' });

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
        ]
      ),
    );
  });

  it('should handle token route with grant type refresh token with invalid refresh token', async () => {
    const refreshToken = sign(
      { grant_type: 'authorization_code' },
      'invalid-secret',
      {
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithm: 'HS256',
      },
    );

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: INVALID_TOKEN,
            data: {
              location: 'body',
              path: 'refresh_token',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with grant type refresh token with invalid grant type inside refresh token', async () => {
    const refreshToken = sign({ grant_type: 'sign_in' }, REFRESH_TOKEN_SECRET, {
      audience: AUDIENCE,
      issuer: ISSUER,
      algorithm: 'HS256',
    });

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: {
              code: INVALID_GRANT_TYPE.code,
              message: INVALID_GRANT_TYPE.messages[0],
            },
            data: {
              location: 'body',
              path: 'refresh_token',
            },
          },
        ]
      ),
    );
  });

  it('should handle token route with grant type refresh token', async () => {
    const refreshToken = sign(
      { grant_type: 'authorization_code' },
      REFRESH_TOKEN_SECRET,
      {
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithm: 'HS256',
      },
    );

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/oauth2/token').send({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      access_token: expect.stringMatching(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      ),
      refresh_token: expect.stringMatching(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      ),
      token_type: 'bearer',
      expires: expect.any(Number),
    });
  });
});
