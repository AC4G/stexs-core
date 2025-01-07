import { Result } from 'express-validator';

export interface ApiError {
	info: {
		code: string;
		message: string;
	};
	data?: Record<string, any>;
}
export interface ApiErrorResponse {
	code: string;
	message: string;
	data?: Record<string, any>;
	timestamp: string;
}

export interface ApiResponse {
	success: boolean;
	message: string;
	timestamp: string;
	data: Record<string, any>;
	errors: ApiErrorResponse[];
}

export function message(
	message: string,
	data: Record<string, any> = {},
	errors: ApiError[] = [],
) {
	const baseMessage = {
		success: errors.length === 0,
		message,
		timestamp: new Date().toISOString(),
		data: {
			...data,
		},
		errors: errors.length > 0 ? errorMessages(errors) : [],
	};

	const onTest = () => {
		return {
			...baseMessage,
			//@ts-ignore
			timestamp: expect.any(String),
		};
	};

	return {
		...baseMessage,
		onTest,
	};
}

function errorMessages(errors: ApiError[]): ApiErrorResponse[]{
	return errors.map((error) => ({
		code: error.info.code,
		message: error.info.message,
		timestamp: new Date().toISOString(),
		data: {
			...error.data,
		},
	}));
}

export interface ValidatorError {
	msg:
		| {
				code: string;
				message: string;
		  }
		| string;
	type: string;
	value: string;
	path: string;
	location: string;
}

export function errorMessagesFromValidator(errors: Result<ValidatorError>): ApiResponse {
	return message('Validation of request data failed.', {}, errors.array().map((error: ValidatorError) => {
		const msg =
			typeof error.msg === 'string' ? JSON.parse(error.msg) : error.msg;
		return {
			info: {
				code: msg.code,
				message: msg.message,
			},
			data: {
				path: error.path,
				location: error.location,
			},
		};
	}));
}

export class CustomValidationError extends Error {
	constructor(info: { code: string; message: string }) {
		super(JSON.stringify(info));
		this.name = 'CustomValidationError';
	}
}
