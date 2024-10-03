import {
	expect,
	jest,
	describe,
	afterEach,
	it,
	beforeEach,
} from '@jest/globals';

const mockQuery = jest.fn();

import request from 'supertest';
import server from '../../src/server';
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
import { message, testErrorMessages } from 'utils-node/messageBuilder';

jest.mock('../../src/database', () => {
	return {
		__esModule: true,
		default: {
			query: mockQuery,
		},
	};
});

jest.mock('nodemailer');

const sendMailMock = jest.fn();

const nodemailer = require('nodemailer');
nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

describe('Sign Up', () => {
	beforeEach(() => {
		sendMailMock.mockClear();
		nodemailer.createTransport.mockClear();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should handle sign up with missing username', async () => {
		const response = await request(server).post('/sign-up').send({
			email: 'test@example.com',
			password: 'Test12345.',
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			testErrorMessages([
				{
					info: USERNAME_REQUIRED,
					data: {
						location: 'body',
						path: 'username',
					},
				},
			]),
		);
	});

	it('should handle sign up with username longer then 20 characters', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'ZaZlZeBu1mFOqDuultl1P',
			email: 'test@example.com',
			password: 'Test12345.',
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			testErrorMessages([
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
			]),
		);
	});

	it('should handle sign up with username as email', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'test@example.com',
			email: 'test@example.com',
			password: 'Test12345.',
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			testErrorMessages([
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
				{
					info: {
						code: INVALID_USERNAME.code,
						message: INVALID_USERNAME.messages[1],
					},
					data: {
						location: 'body',
						path: 'username',
					},
				},
			]),
		);
	});

	it('should handle sing up with username using non QWERTY characters', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'тт123',
			email: 'test@example.com',
			password: 'Test12345.',
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			testErrorMessages([
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
			]),
		);
	});

	it('should handle sign up with missing email', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
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

	it('should handle sign up with invalid email', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
			email: 'test@example',
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

	it('should handle sign up with missing password', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
			email: 'test@example.com',
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

	it('should handle sign up with invalid password according to regex specification', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
			email: 'test@example.com',
			password: 'test123456',
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

	it('should handle sign up with less then 10 characters', async () => {
		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
			email: 'test@example.com',
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

	it('should handle sign up with already existing username', async () => {
		mockQuery.mockRejectedValue({
			hint: 'Please choose a different username',
		} as never);

		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
			email: 'test@example.com',
			password: 'Test12345.',
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			testErrorMessages([
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
			]),
		);
	});

	it('should handle sign up with already existing email', async () => {
		mockQuery.mockRejectedValue({
			hint: 'Please choose a different email',
		} as never);

		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
			email: 'test@example.com',
			password: 'Test12345.',
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual(
			testErrorMessages([
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
			]),
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

		const response = await request(server).post('/sign-up').send({
			username: 'Test123',
			email: 'test@example.com',
			password: 'Test12345.',
		});

		expect(response.status).toBe(201);
		expect(response.body).toEqual(
			message(
				'Sign up successful. Check your email for an verification link!',
			).onTest(),
		);
	});
});
