const mockQuery = jest.fn();

jest.mock('../app/database', () => {
    return {
        __esModule: true,
        default: {
            query: mockQuery
        }
    }
});

import request from 'supertest';
import server from '../app/server';
import { REDIRECT_TO_SIGN_IN } from '../env-config';

describe('Email Verification Routes', () => {
  it('should return 400 with missing email', async () => {
    const response = await request(server)
        .get('/verify-email')
        .query({ token: 'valid-token' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      {
          code: 'EMAIL_REQUIRED',
          message: 'Please provide an email.',
          timestamp: expect.any(String),
          data: {
              path: 'email',
              location: 'query'
          }
      }
    ]);
  });

  it('should return 400 with invalid email', async () => {
    const response = await request(server)
        .get('/verify-email')
        .query({ token: 'valid-token', email: 'test' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address.',
          timestamp: expect.any(String),
          data: {
              path: 'email',
              location: 'query'
          }
      }
    ]);
  });

  it('should return 400 with missing token', async () => {
    const response = await request(server)
        .get('/verify-email')
        .query({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      {
          code: 'TOKEN_REQUIRED',
          message: 'Please provide the verification token from your email.',
          timestamp: expect.any(String),
          data: {
              path: 'token',
              location: 'query'
          }
      }
    ]);
  });

  it('should handle email verification with invalid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          verification_token: 'valid-token',
          email_verified_at: null
        }
      ],
      rowCount: 1
    });

    const response = await request(server)
      .get('/verify-email')
      .query({ email: 'test@example.com', token: 'invalid-token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(`${REDIRECT_TO_SIGN_IN}?source=verify-email&code=error&message=Provided+verification+link+is+invalid`);
  });

  it('should handle email verification with non existing email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0
    });

    const response = await request(server)
      .get('/verify-email')
      .query({ email: 'test@example.com', token: 'token' });

      expect(response.status).toBe(302);
      expect(response.headers['location']).toContain(`${REDIRECT_TO_SIGN_IN}?source=verify-email&code=error&message=Provided+verification+link+is+invalid`);
  });

  it('should handle email verification with verified email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          verification_token: null,
          email_verified_at: 'date'
        }
      ],
      rowCount: 1
    });

    const response = await request(server)
      .get('/verify-email')
      .query({ email: 'test@example.com', token: 'valid-token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(`${REDIRECT_TO_SIGN_IN}?source=verify-email&code=error&message=Your+email+has+been+already+verified`);
  })

  it('should handle email verification with valid token', async () => {

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          verification_token: 'valid-token',
          email_verified_at: null
        }
      ],
      rowCount: 1
    });

    const response = await request(server)
      .get('/verify-email')
      .query({ email: 'test@example.com', token: 'valid-token' });

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain(`${REDIRECT_TO_SIGN_IN}?source=verify-email&code=success&message=Email+successfully+verified`);
  });

  // resend verification email

  it('should handle email resend with empty email', async () => {
    const response = await request(server)
      .post('/verify-email/resend');

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual([
        {
            code: 'EMAIL_REQUIRED',
            message: 'Please provide an email.',
            timestamp: expect.any(String),
            data: {
                path: 'email',
                location: 'body'
            }
        }
      ]);
  });

  it('should handle email resend with invalid email', async () => {
    const response = await request(server)
      .post('/verify-email/resend')
      .send({ email: 'test' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address.',
          timestamp: expect.any(String),
          data: {
              path: 'email',
              location: 'body'
          }
      }
    ]);
  })

  it('should handle email resend with non existing email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0
    });

    const response = await request(server)
      .post('/verify-email/resend')
      .send({ email: 'test@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.errors).toEqual([
        {
            code: 'EMAIL_NOT_FOUND',
            message: 'Email address not found.',
            timestamp: expect.any(String),
            data: {}
        }
      ]);
  });

  it('should handle email resend with already verified email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email_confirmed_at: '2023-08-21T12:34:56Z'
        }
      ],
      rowCount: 1
    });

    const response = await request(server)
      .post('/verify-email/resend')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      {
          code: 'EMAIL_ALREADY_VERIFIED',
          message: 'Your email has been already verified.',
          timestamp: expect.any(String),
          data: {}
      }
    ]);
  });

  it('should handle email resend with valid email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email_confirmed_at: null
        }
      ],
      rowCount: 1
    });

    const response = await request(server)
      .post('/verify-email/resend')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      {
          success: true,
          message: 'New verification email has been sent to test@example.com',
          timestamp: expect.any(String),
          data: {}
      }
    );
  });
});
