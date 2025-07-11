import {
	expect,
	jest,
	describe,
	afterEach,
	it,
	beforeAll,
	afterAll,
} from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import app from '../../../src/app';
import {
	EMAIL_REQUIRED,
	INVALID_EMAIL,
	INVALID_INPUT_DATA,
	INVALID_PASSWORD,
	INVALID_PASSWORD_LENGTH,
	INVALID_USERNAME,
	PASSWORD_REQUIRED,
	USERNAME_REQUIRED,
} from 'utils-node/errors';
import { message } from '../../../src/utils/messageBuilder';
import { advanceTo, clear } from 'jest-date-mock';

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

describe('Sign Up', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	beforeAll(() => {
			advanceTo(new Date('2023-09-15T12:00:00'));
	});
	
	afterAll(() => {
		clear();
	});

	it('should handle sign up with missing username', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				email: 'test@example.com',
				password: 'Test12345.',
			});

		const data = {
			location: 'body',
			path: 'username',
		}

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: USERNAME_REQUIRED,
					data,
				},
				{
					info: {
						code: INVALID_USERNAME.code,
						message: INVALID_USERNAME.messages[0],
					},
					data,
				},
				{
					info: {
						code: INVALID_USERNAME.code,
						message: INVALID_USERNAME.messages[2],
					},
					data,
				},
			]).onTest(),
		);
	});

	it('should handle sign up with username longer then 20 characters', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'ZaZlZeBu1mFOqDuultl1P',
				email: 'test@example.com',
				password: 'Test12345.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: {
						code: INVALID_USERNAME.code,
						message: INVALID_USERNAME.messages[0],
					},
					data: {
						location: 'body',
						path: 'username',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign up with username as email', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'test@example.com',
				email: 'test@example.com',
				password: 'Test12345.',
			});

		const data = {
			location: 'body',
			path: 'username',
		}

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: {
						code: INVALID_USERNAME.code,
						message: INVALID_USERNAME.messages[1],
					},
					data,
				},
				{
					info: {
						code: INVALID_USERNAME.code,
						message: INVALID_USERNAME.messages[2],
					},
					data,
				},
			]).onTest(),
		);
	});

	it('should handle sing up with username using non QWERTY characters', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'тт123',
				email: 'test@example.com',
				password: 'Test12345.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: {
						code: INVALID_USERNAME.code,
						message: INVALID_USERNAME.messages[2],
					},
					data: {
						location: 'body',
						path: 'username',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign up with missing email', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				password: 'Test12345.',
			});

		const data = {
			location: 'body',
			path: 'email',
		}

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

	it('should handle sign up with invalid email', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				email: 'test@example',
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

	it('should handle sign up with missing password', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				email: 'test@example.com',
			});

		const data = {
			location: 'body',
			path: 'password',
		}

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

	it('should handle sign up with invalid password according to regex specification', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				email: 'test@example.com',
				password: 'test123456',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Validation of request data failed.', {}, [
				{
					info: INVALID_PASSWORD,
					data: {
						location: 'body',
						path: 'password',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign up with less then 10 characters', async () => {
		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				email: 'test@example.com',
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

	it('should handle sign up with already existing username', async () => {
		mockQuery.mockRejectedValue({
			hint: 'Please choose a different username',
		} as never);

		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				email: 'test@example.com',
				password: 'Test12345.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Invalid input data.', {}, [
				{
					info: {
						code: INVALID_INPUT_DATA.code,
						message: 'Please choose a different username.',
					},
					data: {
						location: 'body',
						path: 'username',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign up with already existing email', async () => {
		mockQuery.mockRejectedValue({
			hint: 'Please choose a different email',
		} as never);

		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				email: 'test@example.com',
				password: 'Test12345.',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			message('Invalid input data.', {}, [
				{
					info: {
						code: INVALID_INPUT_DATA.code,
						message: 'Please choose a different email.',
					},
					data: {
						location: 'body',
						path: 'email',
					},
				},
			]).onTest(),
		);
	});

	it('should handle sign up', async () => {
		mockQuery.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
				},
			],
			rowCount: 1,
		} as never);

		const response = await request(app)
			.post('/auth/sign-up')
			.send({
				username: 'Test123',
				email: 'test@example.com',
				password: 'Test12345.',
			});

		expect(response.status).toBe(201);
		expect(response.body).toEqual(
			message('Sign up successful. Check your email for a verification link!').onTest(),
		);
	});
});
