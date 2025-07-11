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
import app from '../../../src/app';
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
import { message } from '../../../src/utils/messageBuilder';
import { hashPassword } from '../../../src/utils/password';

jest.mock('../../../src/producers/emailProducer', () => {
  const actual = jest.requireActual<typeof import('../../../src/producers/emailProducer')>(
    '../../../src/producers/emailProducer'
  );

  return {
    ...actual,
    sendEmailMessage: jest.fn(),
  };
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
		const response = await request(app)
			.post('/auth/recovery');

		const data = {
			location: 'body',
			path: 'email',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: EMAIL_REQUIRED,
					data,
				},
				{
					info: {
						code: INVALID_EMAIL.code,
						message: INVALID_EMAIL.messages[0],
					},
					data
				},
			]).onTest(),
		);
	});

	it('should handle recovery with invalid email', async () => {
		const response = await request(app)
			.post('/auth/recovery')
			.send({ email: 'test' });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
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
			]).onTest(),
		);
	});

	it('should handle recovery with non existing email', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(app)
			.post('/auth/recovery')
			.send({ email: 'test@example.com' });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Invalid email for password recovery provided.', {}, [
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
			]).onTest(),
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

		const response = await request(app)
			.post('/auth/recovery')
			.send({ email: 'test@example.com' });

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Recovery email was been send to the email provided.').onTest(),
		);
	});

	it('should handle confirm recovery with missing email', async () => {
		const response = await request(app).post('/auth/recovery/confirm').send({
			token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
			password: 'Test12345.',
		});

		const data = {
			location: 'body',
			path: 'email',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: EMAIL_REQUIRED,
					data,
				},
				{
					info: {
						code: INVALID_EMAIL.code,
						message: INVALID_EMAIL.messages[0],
					},
					data
				},
			]).onTest(),
		);
	});

	it('should handle confirm recovery with invalid email', async () => {
		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
				password: 'Test12345.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
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
			]).onTest(),
		);
	});

	it('should handle confirm recovery with missing token', async () => {
		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				password: 'Test12345.',
			});

		const data = {
			location: 'body',
			path: 'token',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: TOKEN_REQUIRED,
					data,
				},
				{
					info: INVALID_UUID,
					data
				},
			]).onTest(),
		);
	});

	it('should handle confirm recovery with token not in uuid format', async () => {
		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: 'token',
				password: 'Test12345.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_UUID,
					data: {
						location: 'body',
						path: 'token',
					},
				},
			]).onTest(),
		);
	});

	it('should handle confirm recovery with missing password', async () => {
		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
			});

		const data = {
			location: 'body',
			path: 'password',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: PASSWORD_REQUIRED,
					data,
				},
				{
					info: INVALID_PASSWORD,
					data,
				},
				{
					info: INVALID_PASSWORD_LENGTH,
					data,
				},
			]).onTest(),
		);
	});

	it('should handle confirm recovery with invalid password according to regex specification', async () => {
		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
				password: 'test123',
			});

		const data = {
			location: 'body',
			path: 'password',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_PASSWORD,
					data,
				},
				{
					info: INVALID_PASSWORD_LENGTH,
					data,
				},
			]).onTest(),
		);
	});

	it('should handle confirm recovery with password having less then 10 characters', async () => {
		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
				password: 'Test123.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_PASSWORD_LENGTH,
					data: {
						location: 'body',
						path: 'password',
					},
				},
			]).onTest(),
		);
	});

	it('should handle confirm recovery with invalid data', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
				password: 'Test12345.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Invalid request for password recovery confirmation.', {}, [
				{
					info: INVALID_REQUEST,
					data: {
						location: 'body',
						paths: ['email', 'token'],
					},
				},
			]).onTest(),
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

		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
				password: 'Test12345.',
			});

		expect(response.status).toBe(403);
		expect(response.body).toEqual(
			message('Password recovery token expired.', {}, [
				{
					info: RECOVERY_LINK_EXPIRED,
					data: {
						location: 'body',
						path: 'token',
					},
				},
			]).onTest(),
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

		const password = 'Test12345.';
		const passwordHash = await hashPassword(password);

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					encrypted_password: passwordHash,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
				password,
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('New password matches the current password.', {}, [
				{
					info: NEW_PASSWORD_EQUALS_CURRENT,
					data: {
						location: 'body',
						path: 'password',
					},
				},
			]).onTest(),
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

		const passwordHash = await hashPassword('Test12345678.');

		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					encrypted_password: passwordHash,
				},
			],
			rowCount: 1,
		} as never);

		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 1,
		} as never);

		const response = await request(app)
			.post('/auth/recovery/confirm')
			.send({
				email: 'test@example.com',
				token: '06070f2c-08b3-47ee-aa68-7b8deb151da2',
				password: 'Test123456.',
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('Password successfully recovered.').onTest(),
		);
	});
});
