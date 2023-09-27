const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../app/server';
import { NextFunction } from 'express';
import { 
    CODE_EXPIRED,
    CODE_REQUIRED, 
    INVALID_CODE, 
    INVALID_TYPE, 
    TOTP_ALREADY_DISABLED, 
    TOTP_ALREADY_ENABLED, 
    TOTP_ALREADY_VERIFIED, 
    TWOFA_EMAIL_ALREADY_DISABLED, 
    TWOFA_EMAIL_ALREADY_ENABLED,
    TYPE_REQUIRED
} from '../../app/constants/errors';
import { 
    SERVICE_NAME, 
    TOTP_ALGORITHM, 
    TOTP_DIGITS, 
    TOTP_PERIOD
} from '../../env-config';
import { getTOTPForVerification } from '../../app/services/totpService';
import { advanceTo, clear } from 'jest-date-mock';

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

describe('2FA Routes', () => {
    beforeAll(() => {
        advanceTo(new Date('2023-09-15T12:00:00'));
    });

    afterAll(() => {
        clear();
    });

    it('should handle 2FA status', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: true,
                    totp: true
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .get('/2fa');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            {
                email: true,
                totp: true
            }
        );
    });

    it('should handle 2FA TOTP enable with TOTP already enabled', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp: true,
                    email: 'test@example.com'
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/totp');

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TOTP_ALREADY_ENABLED.code,
                message: TOTP_ALREADY_ENABLED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA TOTP enable', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp: false,
                    email: 'test@example.com'
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/totp');

        const otpAuthUriPattern = `otpauth:\/\/totp\/${SERVICE_NAME}:test%40example\.com\\?issuer=${SERVICE_NAME}&secret=[A-Z0-9]{32}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}$`;

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            secret: expect.stringMatching(/^.{32}$/),
            otpAuthUri: expect.stringMatching(new RegExp(otpAuthUriPattern))
        }); 
    });

    it('should handle 2FA TOTP disable without code', async () => {
        const response = await request(server)
            .post('/2fa/totp/disable');

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: CODE_REQUIRED.code,
                message: CODE_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'code'
                }
            }
        ]);
    });

    it('should handle 2FA TOTP disable with invalid already disabled TOTP', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp: false,
                    totp_secret: null
                }
            ],
            rowCount: 1
        });
        
        const response = await request(server)
            .post('/2fa/totp/disable')
            .send({ code: 'code'});

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TOTP_ALREADY_DISABLED.code,
                message: TOTP_ALREADY_DISABLED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA TOTP disable with invalid code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp: true,
                    totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ'
                }
            ],
            rowCount: 1
        });
        
        const response = await request(server)
            .post('/2fa/totp/disable')
            .send({ code: '34456T'});

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_CODE.code,
                message: INVALID_CODE.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA TOTP disable', async () => {
        const code = getTOTPForVerification('VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ').generate();

        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp: true,
                    totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ'
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/totp/disable')
            .send({ code });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            {
                success: true,
                message: 'TOTP 2FA successfully disabled.',
                timestamp: expect.any(String),
                data: {}
            }
          );
    });

    it('should handle 2FA email enable without code', async () => {
        const response = await request(server)
            .post('/2fa/email');

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: CODE_REQUIRED.code,
                message: CODE_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'code'
                }
            }
        ]);
    });

    it('should handle 2FA email enable with already enabled 2FA email', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: true,
                    email_code: null,
                    email_code_sent_at: null
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/email')
            .send({ code: 'code' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TWOFA_EMAIL_ALREADY_ENABLED.code,
                message: TWOFA_EMAIL_ALREADY_ENABLED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA email enable with invalid code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: false,
                    email_code: 'valid-code',
                    email_code_sent_at: '2023-09-15T12:00:00' 
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/email')
            .send({ code: 'invalid-code' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_CODE.code,
                message: INVALID_CODE.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA email enable with expired code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: false,
                    email_code: 'code',
                    email_code_sent_at: '2023-09-15T11:54:00' 
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/email')
            .send({ code: 'code' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: CODE_EXPIRED.code,
                message: CODE_EXPIRED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA email enable', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: false,
                    email_code: 'code',
                    email_code_sent_at: '2023-09-15T12:00:00' 
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/email')
            .send({ code: 'code' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            {
                success: true,
                message: 'Email 2FA successfully enabled.',
                timestamp: expect.any(String),
                data: {}
            }
        );
    });

    it('should handle 2FA email disable without code', async () => {
        const response = await request(server)
            .post('/2fa/email/disable');

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: CODE_REQUIRED.code,
                message: CODE_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'code'
                }
            }
        ]);
    });

    it('should handle 2FA email disable with already disabled 2FA email', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: false,
                    email_code: null,
                    email_code_sent_at: null
                }
            ],
            rowCount: 1
        });
        
        const response = await request(server)
            .post('/2fa/email/disable')
            .send({ code: 'code' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TWOFA_EMAIL_ALREADY_DISABLED.code,
                message: TWOFA_EMAIL_ALREADY_DISABLED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA email disable with invalid code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: true,
                    email_code: 'valid-code',
                    email_code_sent_at: '2023-09-15T12:00:00'
                }
            ],
            rowCount: 1
        });
        
        const response = await request(server)
            .post('/2fa/email/disable')
            .send({ code: 'invalid-code' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_CODE.code,
                message: INVALID_CODE.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA email disable expired code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: true,
                    email_code: 'code',
                    email_code_sent_at: '2023-09-15T11:54:00'
                }
            ],
            rowCount: 1
        });
        
        const response = await request(server)
            .post('/2fa/email/disable')
            .send({ code: 'code' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: CODE_EXPIRED.code,
                message: CODE_EXPIRED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA email disable', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    email: true,
                    email_code: 'code',
                    email_code_sent_at: '2023-09-15T12:00:00'
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/email/disable')
            .send({ code: 'code' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            {
                success: true,
                message: 'Email 2FA successfully disabled.',
                timestamp: expect.any(String),
                data: {}
            }
        );
    });

    it('should handle 2FA verify without type', async() => {
        const response = await request(server)
            .post('/2fa/verify')
            .send({ code: 'code' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TYPE_REQUIRED.code,
                message: TYPE_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'type'
                }
            }
        ]);
    });

    it('should handle 2FA verify with unsupported type', async () => {
        const response = await request(server)
            .post('/2fa/verify')
            .send({ 
                code: 'code',
                type: 'sms' 
            });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_TYPE.code,
                message: INVALID_TYPE.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'type'
                }
            }
        ]);
    });

    it('should handle 2FA verify without code', async () => {
        const response = await request(server)
            .post('/2fa/verify')
            .send({ type: 'totp' });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: CODE_REQUIRED.code,
                message: CODE_REQUIRED.message,
                timestamp: expect.any(String),
                data: {
                    location: 'body',
                    path: 'code'
                }
            }
        ]);
    });

    it('should handle 2FA verify TOTP with already verified TOTP', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
                    totp_verified_at: '2023-09-15T12:00:00'
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/verify')
            .send({ 
                code: '45928T',
                type: 'totp' 
            });

        expect(response.status).toBe(400);
        expect(response.body.errors).toEqual([
            {
                code: TOTP_ALREADY_VERIFIED.code,
                message: TOTP_ALREADY_VERIFIED.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA verify TOTP with invalid code', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
                    totp_verified_at: null
                }
            ],
            rowCount: 1
        });

        const response = await request(server)
            .post('/2fa/verify')
            .send({ 
                code: '45928T',
                type: 'totp' 
            });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual([
            {
                code: INVALID_CODE.code,
                message: INVALID_CODE.message,
                timestamp: expect.any(String),
                data: {}
            }
        ]);
    });

    it('should handle 2FA verify TOTP', async () => {
        const code = getTOTPForVerification('VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ').generate();

        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
                    totp_verified_at: null
                }
            ],
            rowCount: 1
        });

        mockQuery.mockResolvedValueOnce({
            rows: [],
            rowCount: 1
        });


        const response = await request(server)
            .post('/2fa/verify')
            .send({ 
                code,
                type: 'totp' 
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            {
                success: true,
                message: 'TOTP 2FA successfully enabled.',
                timestamp: expect.any(String),
                data: {}
            }
        );
    });
}); 