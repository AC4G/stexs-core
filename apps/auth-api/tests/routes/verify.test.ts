import {expect, jest, describe, afterEach, beforeAll, afterAll, it} from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../src/server';
import { REDIRECT_TO_SIGN_IN } from '../../env-config';
import {
  EMAIL_ALREADY_VERIFIED,
  EMAIL_NOT_FOUND,
  EMAIL_REQUIRED,
  INVALID_EMAIL,
  TOKEN_REQUIRED,
} from 'utils-ts/errors';
import { advanceTo, clear } from 'jest-date-mock';
import {
  message,
  testErrorMessages,
} from 'utils-ts/messageBuilder';

jest.mock('../../src/database', () => {
  return {
    __esModule: true,
    default: {
      query: mockQuery,
    },
  };
});

describe('Email Verification Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    advanceTo(new Date('2023-09-15T12:00:00'));
  });

  afterAll(() => {
    clear();
  });

  it('should handle email verification with missing email', async () => {
    const response = await request(server)
      .get('/verify')
      .query({ token: 'valid-token' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: EMAIL_REQUIRED,
          data: {
            location: 'query',
            path: 'email',
          },
        },
      ], expect),
    );
  });

  it('should handle email verification with invalid email', async () => {
    const response = await request(server)
      .get('/verify')
      .query({ token: 'valid-token', email: 'test' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: {
            code: INVALID_EMAIL.code,
            message: INVALID_EMAIL.messages[0],
          },
          data: {
            location: 'query',
            path: 'email',
          },
        },
      ], expect),
    );
  });

  it('should handle email verification with missing token', async () => {
    const response = await request(server)
      .get('/verify')
      .query({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: TOKEN_REQUIRED,
          data: {
            location: 'query',
            path: 'token',
          },
        },
      ], expect),
    );
  });

  it('should handle email verification with invalid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .get('/verify')
      .query({ email: 'test@example.com', token: 'invalid-token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(
      `${REDIRECT_TO_SIGN_IN}?source=verify&code=error&message=Provided+verification+link+is+invalid.`,
    );
  });

  it('should handle email verification with non existing email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .get('/verify')
      .query({ email: 'test@example.com', token: 'token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(
      `${REDIRECT_TO_SIGN_IN}?source=verify&code=error&message=Provided+verification+link+is+invalid.`,
    );
  });

  it('should handle email verification with verified email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email_verified_at: 'date',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .get('/verify')
      .query({ email: 'test@example.com', token: 'valid-token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(
      `${REDIRECT_TO_SIGN_IN}?source=verify&code=error&message=Your+email+has+been+already+verified.`,
    );
  });

  it('should handle email verification with expired link', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email_verified_at: null,
          verification_sent_at: '2023-09-14T11:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .get('/verify')
      .query({ email: 'test@example.com', token: 'valid-token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(
      `${REDIRECT_TO_SIGN_IN}?source=verify&code=error&message=Verification+link+expired.+Please+request+a+new+verification+link.`,
    );
  });

  it('should handle email verification with valid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email_verified_at: null,
          verification_sent_at: '2023-09-15T11:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .get('/verify')
      .query({ email: 'test@example.com', token: 'valid-token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(
      `${REDIRECT_TO_SIGN_IN}?source=verify&code=success&message=Email+successfully+verified.`,
    );
  });

  it('should handle email resend with empty email', async () => {
    const response = await request(server).post('/verify/resend');

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
      ], expect),
    );
  });

  it('should handle email resend with invalid email', async () => {
    const response = await request(server)
      .post('/verify/resend')
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
      ], expect),
    );
  });

  it('should handle email resend with non existing email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .post('/verify/resend')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      testErrorMessages([{ info: EMAIL_NOT_FOUND }], expect),
    );
  });

  it('should handle email resend with already verified email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email_confirmed_at: '2023-08-21T12:34:56Z',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/verify/resend')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: EMAIL_ALREADY_VERIFIED }], expect),
    );
  });

  it('should handle email resend with valid email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email_confirmed_at: null,
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const email = 'test@example.com';

    const response = await request(server)
      .post('/verify/resend')
      .send({ email });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message(`New verification email has been sent to ${email}`).onTest(),
    );
  });
});
