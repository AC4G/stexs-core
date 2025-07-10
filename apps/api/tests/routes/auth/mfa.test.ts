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
import server from '../../../src/server';
import { NextFunction } from 'express';
import {
	CODE_EXPIRED,
	CODE_REQUIRED,
	INVALID_CODE,
	MFA_TOTP_ALREADY_DISABLED,
	MFA_TOTP_ALREADY_ENABLED,
	MFA_TOTP_ALREADY_VERIFIED,
	MFA_EMAIL_ALREADY_DISABLED,
	MFA_EMAIL_ALREADY_ENABLED,
	TYPE_REQUIRED,
	CODE_LENGTH_MISMATCH,
	UNSUPPORTED_TYPE,
	CODE_FORMAT_INVALID_TOTP,
	CODE_FORMAT_INVALID_EMAIL,
} from 'utils-node/errors';
import { SERVICE_NAME } from '../../../env-config';
import { getTOTPForVerification } from '../../../src/utils/totp';
import { advanceTo, clear } from 'jest-date-mock';
import { message } from '../../../src/utils/messageBuilder';

jest.mock('../../../src/producers/emailProducer', () => {
  const actual = jest.requireActual<typeof import('../../../src/producers/emailProducer')>(
    '../../../src/producers/emailProducer'
  );

  return {
    ...actual,
    sendEmailMessage: jest.fn(),
  };
});

jest.mock('../../../src/middlewares/jwtMiddleware', () => {
	return {
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
	}
});

jest.mock('../../../src/db', () => {
	return {
		__esModule: true,
		default: {
			query: mockQuery,
			withTransaction: async (callback: any) => {
				const mockClient = {
					query: mockQuery,
				};

				try {
					return await callback(mockClient);
				} catch (e) {
					throw e;
				}
			},
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

		const response = await request(server)
			.get('/auth/mfa');

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('MFA flows successfully retrieved.', {
				email: true,
				totp: true,
			}).onTest(),
		);
	});

	it('should handle MFA TOTP enable with TOTP already enabled', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: '2023-09-15T12:00:00',
					email: 'test@example.com',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/enable')
			.send({
				type: 'totp',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('MFA TOTP is already enabled.', {}, [{ info: MFA_TOTP_ALREADY_ENABLED }]).onTest(),
		);
	});

	it('should handle MFA TOTP enable', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: null,
					email: 'test@example.com',
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/enable')
			.send({
				type: 'totp',
			});

		const otpAuthUriPattern = `otpauth://totp/${SERVICE_NAME}:test%40example.com\\?issuer=${SERVICE_NAME}&secret=[A-Z0-9]{32}&algorithm=SHA256&digits=6&period=30$`;

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('MFA TOTP successfully initialized.', {
				secret: expect.stringMatching(/^.{32}$/),
				otp_auth_uri: expect.stringMatching(new RegExp(otpAuthUriPattern)),
			}).onTest(),
		);
	});

	it('should handle MFA TOTP disable without code', async () => {
		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				type: 'totp',
			});

		const data = {
			location: 'body',
			path: 'code',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CODE_REQUIRED,
					data
				},
				{
					info: CODE_FORMAT_INVALID_TOTP,
					data
				},
			]).onTest(),
		);
	});

	it('should handle MFA TOTP disable with invalid already disabled TOTP', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: null,
					totp_secret: null,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				code: 345089,
				type: 'totp',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('MFA TOTP is already disabled.', {}, [{ info: MFA_TOTP_ALREADY_DISABLED }]).onTest(),
		);
	});

	it('should handle MFA TOTP disable with invalid code', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: '2023-09-15T12:00:00',
					email: true,
					totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				code: 345089,
				type: 'totp',
			});

		expect(response.status).toBe(403);
		expect(response.body).toEqual(
			message('Invalid code provided.', {}, [
				{
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle MFA TOTP disable', async () => {
		const code = getTOTPForVerification(
			'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
		).generate();

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: '2023-09-15T12:00:00',
					email: true,
					totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				code,
				type: 'totp',
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('TOTP MFA successfully disabled.').onTest(),
		);
	});

	it('should handle MFA email enable without code', async () => {
		const response = await request(server)
			.post('/auth/mfa/enable')
			.send({
				type: 'email',
			});

		const data = {
			location: 'body',
			path: 'code',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CODE_REQUIRED,
					data,
				},
				{
					info: CODE_LENGTH_MISMATCH,
					data
				},
				{
					info: CODE_FORMAT_INVALID_EMAIL,
					data
				},
			]).onTest(),
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

		const response = await request(server)
			.post('/auth/mfa/enable')
			.send({
				code: 'DLSL2340',
				type: 'email',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('MFA email is already enabled.', {},
				[{ info: MFA_EMAIL_ALREADY_ENABLED }]
			).onTest(),
		);
	});

	it('should handle MFA email enable with invalid code', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					email: false,
					email_code: 'DLSL2340',
					email_code_sent_at: '2023-09-15T12:00:00',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/enable')
			.send({
				code: 'DLSL2341',
				type: 'email',
			});

		expect(response.status).toBe(403);
		expect(response.body).toEqual(
			message('Invalid MFA activation code provided.', {}, [
				{
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle MFA email enable with expired code', async () => {
		const code = 'DSF2349G';

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					email: false,
					email_code: code,
					email_code_sent_at: '2023-09-15T11:54:00',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/enable')
			.send({
				code,
				type: 'email',
			});

		expect(response.status).toBe(403);
		expect(response.body).toEqual(
			message('MFA activation code expired.', {}, [
				{
					info: CODE_EXPIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle MFA email enable', async () => {
		const code = 'DSF2349G';

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					email: false,
					email_code: code,
					email_code_sent_at: '2023-09-15T12:00:00',
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/enable')
			.send({
				code,
				type: 'email',
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Email MFA successfully enabled.').onTest(),
		);
	});

	it('should handle MFA email disable without code', async () => {
		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				type: 'email',
			});

		const data = {
			location: 'body',
			path: 'code',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CODE_REQUIRED,
					data
				},
				{
					info: CODE_FORMAT_INVALID_EMAIL,
					data
				},
			]).onTest(),
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

		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				code: '234456TG',
				type: 'email',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('MFA email is already disabled.', {}, [{ info: MFA_EMAIL_ALREADY_DISABLED }]).onTest(),
		);
	});

	it('should handle MFA email disable with invalid code', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: '2023-09-15T12:00:00',
					email: true,
					email_code: 'DSF2349T',
					email_code_sent_at: '2023-09-15T12:00:00',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				code: 'DSF2349G',
				type: 'email',
			});

		expect(response.status).toBe(403);
		expect(response.body).toEqual(
			message('Invalid code provided.', {}, [
				{
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle MFA verify without type', async () => {
		const response = await request(server)
			.post('/auth/mfa/verify')
			.send({ code: 'code' });

		const dataType = {
			location: 'body',
			path: 'type',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: TYPE_REQUIRED,
					data: dataType,
				},
				{
					info: UNSUPPORTED_TYPE,
					data: dataType
				},
			]).onTest(),
		);
	});

	it('should handle MFA verify with unsupported type', async () => {
		const response = await request(server)
			.post('/auth/mfa/verify')
			.send({
				code: 'code',
				type: 'sms',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: UNSUPPORTED_TYPE,
					data: {
						location: 'body',
						path: 'type',
					},
				},
			]).onTest(),
		);
	});

	it('should handle MFA verify without code', async () => {
		const response = await request(server)
			.post('/auth/mfa/verify')
			.send({ type: 'totp' });

		const data = {
			location: 'body',
			path: 'code',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: CODE_REQUIRED,
					data,
				},
				{
					info: CODE_FORMAT_INVALID_TOTP,
					data
				},
			]).onTest(),
		);
	});

	it('should handle MFA email disable expired code', async () => {
		const code = 'DSF2349G';

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: '2023-09-15T12:00:00',
					email: true,
					email_code: code,
					email_code_sent_at: '2023-09-15T11:54:00',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				code,
				type: 'email',
			}); 

		expect(response.status).toBe(403);
		expect(response.body).toEqual(
			message('Provided code expired.', {}, [
				{
					info: CODE_EXPIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			]).onTest(),
		);
	});

	it('should handle MFA email disable', async () => {
		const code = 'DSF2349G';

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					totp_verified_at: '2023-09-15T12:00:00',
					email: true,
					email_code: code,
					email_code_sent_at: '2023-09-15T12:00:00',
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/mfa/disable')
			.send({
				code,
				type: 'email',
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Email MFA successfully disabled.').onTest(),
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

		const response = await request(server)
			.post('/auth/mfa/verify')
			.send({
				code,
				type: 'totp',
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('TOTP MFA successfully enabled.').onTest(),
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

		const response = await request(server)
			.post('/auth/mfa/verify')
			.send({
				code: 345089,
				type: 'totp',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('MFA TOTP is already verified.', {}, [{ info: MFA_TOTP_ALREADY_VERIFIED }]).onTest(),
		);
	});
});
