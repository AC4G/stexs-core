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
import {
  EMAIL_REQUIRED,
  INVALID_EMAIL,
  INVALID_PASSWORD,
  INVALID_PASSWORD_LENGTH,
  INVALID_REQUEST,
  INVALID_UUID,
  NEW_PASSWORD_EQUALS_CURRENT,
  PASSWORD_REQUIRED,
  RECOVERY_LINK_EXPIRED,
  TOKEN_REQUIRED,
} from 'utils-node/errors';
import { advanceTo, clear } from 'jest-date-mock';
import { message, testErrorMessages } from 'utils-node/messageBuilder';

jest.mock('../../src/database', () => {
  return {
    __esModule: true,
    default: {
      query: mockQuery,
    },
  };
});

describe('Recovery Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    advanceTo(new Date('2023-09-15T12:00:00'));
  });

  afterAll(() => {
    clear();
  });

  it('should handle recovery with missing email', async () => {
    const response = await request(server).post('/recovery');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: EMAIL_REQUIRED,
          data: {
            location: 'body',
            path: 'email',
          },
        },
      ]),
    );
  });

  it('should handle recovery with invalid email', async () => {
    const response = await request(server)
      .post('/recovery')
      .send({ email: 'test' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: {
            code: INVALID_EMAIL.code,
            message: INVALID_EMAIL.messages[0],
          },
          data: {
            location: 'body',
            path: 'email',
          },
        },
      ]),
    );
  });

  it('should handle recovery with non existing email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .post('/recovery')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: {
            code: INVALID_EMAIL.code,
            message: INVALID_EMAIL.messages[0],
          },
          data: {
            location: 'body',
            path: 'email',
          },
        },
      ]),
    );
  });

  it('should handle recovery', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          column: 1,
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/recovery')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Recovery email was been send.').onTest(),
    );
  });

  it('should handle confirm recovery with missing email', async () => {
    const response = await request(server).post('/recovery/confirm').send({
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'Test12345.',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: EMAIL_REQUIRED,
          data: {
            location: 'body',
            path: 'email',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with invalid email', async () => {
    const response = await request(server).post('/recovery/confirm').send({
      email: 'test',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'Test12345.',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: {
            code: INVALID_EMAIL.code,
            message: INVALID_EMAIL.messages[0],
          },
          data: {
            location: 'body',
            path: 'email',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with missing token', async () => {
    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      password: 'Test12345.',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: TOKEN_REQUIRED,
          data: {
            location: 'body',
            path: 'token',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with token not in uuid format', async () => {
    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: 'token',
      password: 'Test12345.',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_UUID,
          data: {
            location: 'body',
            path: 'token',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with missing password', async () => {
    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: PASSWORD_REQUIRED,
          data: {
            location: 'body',
            path: 'password',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with invalid password according to regex specification', async () => {
    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'test123',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_PASSWORD,
          data: {
            location: 'body',
            path: 'password',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with password having less then 10 characters', async () => {
    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'Test123.',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_PASSWORD_LENGTH,
          data: {
            location: 'body',
            path: 'password',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with invalid data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'Test12345.',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_REQUEST,
          data: {
            location: 'body',
            paths: ['email', 'token'],
          },
        },
      ]),
    );
  });

  it('should handle confirm expired recovery token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          recovery_sent_at: new Date('2023-09-15T10:00:00').toISOString(),
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'Test12345.',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: RECOVERY_LINK_EXPIRED,
          data: {
            location: 'body',
            path: 'token',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery with current password', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          recovery_sent_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          is_current_password: true,
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'Test12345.',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: NEW_PASSWORD_EQUALS_CURRENT,
          data: {
            location: 'body',
            path: 'password',
          },
        },
      ]),
    );
  });

  it('should handle confirm recovery', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          recovery_sent_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          is_current_password: false,
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/recovery/confirm').send({
      email: 'test@example.com',
      token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
      password: 'Test12345.',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Password successfully recovered.').onTest(),
    );
  });
});
