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

import { NextFunction } from 'express';
import request from 'supertest';
import server from '../../src/server';
import {
  CODE_EXPIRED,
  CODE_REQUIRED,
  EMAIL_REQUIRED,
  INVALID_CODE,
  INVALID_EMAIL,
  INVALID_PASSWORD,
  INVALID_PASSWORD_LENGTH,
  NEW_PASSWORD_EQUALS_CURRENT,
  PASSWORD_REQUIRED,
  TYPE_REQUIRED,
} from 'utils-node/errors';
import { advanceTo, clear } from 'jest-date-mock';
import { message, testErrorMessages } from 'utils-node/messageBuilder';
import { getTOTPForVerification } from '../../src/services/totpService';

jest.mock('utils-node/jwtMiddleware', () => ({
  validateAccessToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  validateRefreshToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next()
  ),
  validateSignInConfirmOrAccessToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next()
  ),
  checkTokenGrantType: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  validateSignInConfirmToken: jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => next(),
  ),
  transformJwtErrorMessages: jest.fn(() => 
    (err: Object, req: Request, res: Response, next: NextFunction) => {}
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

describe('User Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    advanceTo(new Date('2023-09-15T12:00:00'));
  });

  afterAll(() => {
    clear();
  });

  it('should handle email change verification with expired code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email_change_sent_at: '2023-09-15T10:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/user/email/verify')
      .send({ code: 'code' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([{ info: CODE_EXPIRED }]),
    );
  });

  it('should handle email change verification with invalid code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const response = await request(server)
      .post('/user/email/verify')
      .send({ code: 'code' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: INVALID_CODE }]),
    );
  });

  it('should handle email change with expired verification code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email_change_sent_at: '2023-09-15T10:59:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/user/email/verify')
      .send({ code: 'expired-code' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([{ info: CODE_EXPIRED }]),
    );
  });

  it('should handle email change verification', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email_change_sent_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/user/email/verify')
      .send({ code: 'code' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Email successfully changed.').onTest(),
    );
  });

  it('should handle get user data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email: 'test@example.com',
          raw_user_meta_data: {},
          created_at: 'date',
          updated_at: 'date',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).get('/user');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      email: 'test@example.com',
      raw_user_meta_data: {},
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });

  it('should handle password change with missing password', async () => {
    const response = await request(server).post('/user/password');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: PASSWORD_REQUIRED,
            data: {
              location: 'body',
              path: 'password',
            },
          },
          {
            info: CODE_REQUIRED,
            data: {
              location: 'body',
              path: 'code'
            }
          },
          {
            info: TYPE_REQUIRED,
            data: {
              location: 'body',
              path: 'type'
            }
          }
        ]
      ),
    );
  });

  it('should handle password change with invalid password according to regex specification', async () => {
    const response = await request(server)
      .post('/user/password')
      .send({ 
        password: 'test123456',
        code: 'mfa_code',
        type: 'totp'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: INVALID_PASSWORD,
            data: {
              location: 'body',
              path: 'password',
            },
          },
        ]
      ),
    );
  });

  it('should handle password with current password', async () => {
    const code = getTOTPForVerification(
      'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
    ).generate();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: true,
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ'
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

    const response = await request(server)
      .post('/user/password')
      .send({ 
        password: 'Test12345.',
        code,
        type: 'totp'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: NEW_PASSWORD_EQUALS_CURRENT,
            data: {
              location: 'body',
              path: 'password',
            },
          },
        ]
      ),
    );
  });

  it('should handle password change', async () => {
    const code = getTOTPForVerification(
      'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
    ).generate();
    
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: true,
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ'
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

    const response = await request(server)
      .post('/user/password')
      .send({ 
        password: 'Test12345.',
        code,
        type: 'totp'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Password changed successfully.').onTest(),
    );
  });

  it('should handle password change with password having less then 10 characters', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          is_current_password: true,
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/user/password')
      .send({ 
        password: 'Test123.',
        code: 'mfa_code',
        type: 'totp'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: INVALID_PASSWORD_LENGTH,
            data: {
              location: 'body',
              path: 'password',
            },
          },
        ]
      ),
    );
  });

  it('should handle email change with missing email', async () => {
    const response = await request(server)
      .post('/user/email')
      .send({
        code: 'mfa_code',
        type: 'totp'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
          {
            info: EMAIL_REQUIRED,
            data: {
              location: 'body',
              path: 'email',
            },
          },
        ]
      ),
    );
  });

  it('should handle email change with invalid email', async () => {
    const response = await request(server)
      .post('/user/email')
      .send({ 
        email: 'test',
        code: 'mfa_code',
        type: 'totp'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
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
        ]
      ),
    );
  });

  it('should handle email change', async () => {
    const code = getTOTPForVerification(
      'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
    ).generate();
    
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: true,
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ'
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server)
      .post('/user/email')
      .send({ 
        email: 'test@example.com',
        code,
        type: 'totp'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message(
        'Email change verification link has been sent to the new email address.',
      ).onTest(),
    );
  });

  it('should handle email change verification with missing code', async () => {
    const response = await request(server).post('/user/email/verify');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages(
        [
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
});
