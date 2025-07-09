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
import { REDIRECT_TO_SIGN_IN } from '../../../env-config';
import {
	EMAIL_ALREADY_VERIFIED,
	EMAIL_NOT_FOUND,
	EMAIL_REQUIRED,
	INVALID_EMAIL,
	INVALID_UUID,
	TOKEN_REQUIRED,
} from 'utils-node/errors';
import { advanceTo, clear } from 'jest-date-mock';
import { message } from 'utils-node/messageBuilder';
import { v4 as uuidv4 } from 'uuid';

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

jest.mock('../../../src/producers/emailProducer', () => {
  const actual = jest.requireActual<typeof import('../../../src/producers/emailProducer')>(
    '../../../src/producers/emailProducer'
  );

  return {
    ...actual,
    sendEmailMessage: jest.fn(),
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
			.get('/auth/verify')
			.query({ token: uuidv4() });

		const dataEmail = {
			location: 'query',
			path: 'email',
		};

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: EMAIL_REQUIRED,
					data: dataEmail,
				},
				{
					info: {
						code: INVALID_EMAIL.code,
						message: INVALID_EMAIL.messages[0],
					},
					data: dataEmail,
				},
			]).onTest(),
		);
	});

	it('should handle email verification with invalid email', async () => {
		const response = await request(server)
			.get('/auth/verify')
			.query({
				token: uuidv4(),
				email: 'test'
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
						location: 'query',
						path: 'email',
					},
				},
			]).onTest(),
		);
	});

	it('should handle email verification with missing token', async () => {
		const response = await request(server)
			.get('/auth/verify')
			.query({ email: 'test@example.com' });

		const data = {
			location: 'query',
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
					data,
				},
			]).onTest(),
		);
	});

	it('should handle email verification with invalid token', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.get('/auth/verify')
			.query({
				email: 'test@example.com',
				token: uuidv4()
			});

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
			.get('/auth/verify')
			.query({
				email: 'test@example.com',
				token: uuidv4()
			});

		expect(response.status).toBe(302);
		expect(response.headers['location']).toContain(
			`${REDIRECT_TO_SIGN_IN}?source=verify&code=error&message=Provided+verification+link+is+invalid.`,
		);
	});

	it('should handle email verification with verified email', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					email_verified_at: '2023-09-14T11:00:00',
					verification_sent_at: '2023-09-14T11:00:00',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.get('/auth/verify')
			.query({
				email: 'test@example.com',
				token: uuidv4()
			});

		expect(response.status).toBe(302);
		expect(response.headers['location']).toContain(
			`${REDIRECT_TO_SIGN_IN}?source=verify&code=error&message=Your+email+has+been+already+verified.`,
		);
	});

	it('should handle email verification with expired link', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					email_verified_at: null,
					verification_sent_at: '2023-09-14T11:00:00',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.get('/auth/verify')
			.query({
				email: 'test@example.com',
				token: uuidv4()
			});

		expect(response.status).toBe(302);
		expect(response.headers['location']).toContain(
			`${REDIRECT_TO_SIGN_IN}?source=verify&code=error&message=Verification+link+expired.+Please+request+a+new+verification+link.`,
		);
	});

	it('should handle email verification with valid token', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
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
			.get('/auth/verify')
			.query({
				email: 'test@example.com',
				token: uuidv4()
			});

		expect(response.status).toBe(302);
		expect(response.headers['location']).toContain(
			`${REDIRECT_TO_SIGN_IN}?source=verify&code=success&message=Email+successfully+verified.`,
		);
	});

	it('should handle email resend with empty email', async () => {
		const response = await request(server)
			.post('/auth/verify/resend');

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
					data,
				},
			]).onTest(),
		);
	});

	it('should handle email resend with invalid email', async () => {
		const response = await request(server)
			.post('/auth/verify/resend')
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

	it('should handle email resend with non existing email', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

		const response = await request(server)
			.post('/auth/verify/resend')
			.send({ email: 'test@example.com' });

		console.log(JSON.stringify(response.body));

		expect(response.status).toBe(404);
		expect(response.body).toEqual(
			message('Email not found.', {}, [
				{ info: EMAIL_NOT_FOUND }
			]).onTest(),
		);
	});

	it('should handle email resend with already verified email', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					email_verified_at: '2023-08-21T12:34:56Z',
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(server)
			.post('/auth/verify/resend')
			.send({ email: 'test@example.com' });

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Email already verified.', {}, [
				{ info: EMAIL_ALREADY_VERIFIED }
			]).onTest(),
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
			.post('/auth/verify/resend')
			.send({ email });

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			message('New verification email has been sent').onTest(),
		);
	});
});
