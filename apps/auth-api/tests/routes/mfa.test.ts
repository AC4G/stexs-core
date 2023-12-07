import {expect, jest, describe, afterEach, beforeAll, afterAll, it} from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../src/server';
import { NextFunction } from 'express';
import {
  CODE_EXPIRED,
  CODE_REQUIRED,
  INVALID_CODE,
  INVALID_TYPE,
  TOTP_ALREADY_DISABLED,
  TOTP_ALREADY_ENABLED,
  TOTP_ALREADY_VERIFIED,
  MFA_EMAIL_ALREADY_DISABLED,
  MFA_EMAIL_ALREADY_ENABLED,
  TYPE_REQUIRED,
} from 'utils-ts/errors';
import {
  SERVICE_NAME,
  TOTP_ALGORITHM,
  TOTP_DIGITS,
  TOTP_PERIOD,
} from '../../env-config';
import { getTOTPForVerification } from '../../src/services/totpService';
import { advanceTo, clear } from 'jest-date-mock';
import {
  testErrorMessages,
  message,
} from 'utils-ts/messageBuilder';

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
  transformJwtErrorMessages: jest.fn((err, req, res, next: NextFunction) => next()),
}));

jest.mock('../../src/database', () => {
  return {
    __esModule: true,
    default: {
      query: mockQuery,
    },
  };
});

describe('MFA Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    advanceTo(new Date('2023-09-15T12:00:00'));
  });

  afterAll(() => {
    clear();
  });

  it('should handle MFA status', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: true,
          totp: true,
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).get('/mfa');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      email: true,
      totp: true,
    });
  });

  it('should handle MFA TOTP enable with TOTP already enabled', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: true,
          email: 'test@example.com',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/enable').send({
      type: 'totp',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: TOTP_ALREADY_ENABLED }], expect),
    );
  });

  it('should handle MFA TOTP enable', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: false,
          email: 'test@example.com',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/enable').send({
      type: 'totp',
    });

    const otpAuthUriPattern = `otpauth:\/\/totp\/${SERVICE_NAME}:test%40example\.com\\?issuer=${SERVICE_NAME}&secret=[A-Z0-9]{32}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}$`;

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      secret: expect.stringMatching(/^.{32}$/),
      otp_auth_uri: expect.stringMatching(new RegExp(otpAuthUriPattern)),
    });
  });

  it('should handle MFA TOTP disable without code', async () => {
    const response = await request(server).post('/mfa/disable').send({
      type: 'totp',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CODE_REQUIRED,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA TOTP disable with invalid already disabled TOTP', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: false,
          totp_secret: null,
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/disable').send({
      code: 'code',
      type: 'totp',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: TOTP_ALREADY_DISABLED }], expect),
    );
  });

  it('should handle MFA TOTP disable with invalid code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: true,
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/disable').send({
      code: '34456T',
      type: 'totp',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_CODE,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA TOTP disable', async () => {
    const code = getTOTPForVerification(
      'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
    ).generate();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp: true,
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/disable').send({
      code,
      type: 'totp',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('TOTP MFA successfully disabled.').onTest(),
    );
  });

  it('should handle MFA email enable without code', async () => {
    const response = await request(server).post('/mfa/enable').send({
      type: 'email',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CODE_REQUIRED,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA email enable with already enabled MFA email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: true,
          email_code: null,
          email_code_sent_at: null,
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/enable').send({
      code: 'code',
      type: 'email',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: MFA_EMAIL_ALREADY_ENABLED }], expect),
    );
  });

  it('should handle MFA email enable with invalid code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: false,
          email_code: 'valid-code',
          email_code_sent_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/enable').send({
      code: 'invalid-code',
      type: 'email',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_CODE,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA email enable with expired code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: false,
          email_code: 'code',
          email_code_sent_at: '2023-09-15T11:54:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/enable').send({
      code: 'code',
      type: 'email',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CODE_EXPIRED,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA email enable', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: false,
          email_code: 'code',
          email_code_sent_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/enable').send({
      code: 'code',
      type: 'email',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Email MFA successfully enabled.').onTest(),
    );
  });

  it('should handle MFA email disable without code', async () => {
    const response = await request(server).post('/mfa/disable').send({
      type: 'email',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CODE_REQUIRED,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA email disable with already disabled MFA email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: false,
          email_code: null,
          email_code_sent_at: null,
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/disable').send({
      code: 'code',
      type: 'email',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: MFA_EMAIL_ALREADY_DISABLED }], expect),
    );
  });

  it('should handle MFA email disable with invalid code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: true,
          email_code: 'valid-code',
          email_code_sent_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/disable').send({
      code: 'invalid-code',
      type: 'email',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_CODE,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA email disable expired code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: true,
          email_code: 'code',
          email_code_sent_at: '2023-09-15T11:54:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/disable').send({
      code: 'code',
      type: 'email',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CODE_EXPIRED,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA email disable', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: true,
          email_code: 'code',
          email_code_sent_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/disable').send({
      code: 'code',
      type: 'email',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('Email MFA successfully disabled.').onTest(),
    );
  });

  it('should handle MFA verify without type', async () => {
    const response = await request(server)
      .post('/mfa/verify')
      .send({ code: 'code' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: TYPE_REQUIRED,
          data: {
            location: 'body',
            path: 'type',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA verify with unsupported type', async () => {
    const response = await request(server).post('/mfa/verify').send({
      code: 'code',
      type: 'sms',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_TYPE,
          data: {
            location: 'body',
            path: 'type',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA verify without code', async () => {
    const response = await request(server)
      .post('/mfa/verify')
      .send({ type: 'totp' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: CODE_REQUIRED,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA verify TOTP with already verified TOTP', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
          totp_verified_at: '2023-09-15T12:00:00',
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/verify').send({
      code: '45928T',
      type: 'totp',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      testErrorMessages([{ info: TOTP_ALREADY_VERIFIED }], expect),
    );
  });

  it('should handle MFA verify TOTP with invalid code', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
          totp_verified_at: null,
        },
      ],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/verify').send({
      code: '45928T',
      type: 'totp',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      testErrorMessages([
        {
          info: INVALID_CODE,
          data: {
            location: 'body',
            path: 'code',
          },
        },
      ], expect),
    );
  });

  it('should handle MFA verify TOTP', async () => {
    const code = getTOTPForVerification(
      'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
    ).generate();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
          totp_verified_at: null,
        },
      ],
      rowCount: 1,
    } as never);

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const response = await request(server).post('/mfa/verify').send({
      code,
      type: 'totp',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      message('TOTP MFA successfully enabled.').onTest(),
    );
  });
});
