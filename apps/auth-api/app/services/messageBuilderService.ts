import { Result } from 'express-validator';

export function message(
  message: string,
  data: Record<string, any> = {},
  success: boolean = true,
) {
  const baseMessage = {
    success,
    message,
    timestamp: new Date().toISOString(),
    data: {
      ...data,
    },
  };

  const onTest = () => {
    return {
      ...baseMessage,
      timestamp: expect.any(String),
    };
  };

  return {
    ...baseMessage,
    onTest,
  };
}

interface Error {
  info: {
    code: string;
    message: string;
  };
  data?: {
    [key: string]: any;
  };
}

interface ErrorResponse {
  code: string;
  message: string;
  data?: {
    [key: string]: any;
  };
  timestamp: string;
}

export function errorMessages(errors: Error[]): { errors: ErrorResponse[] } {
  return {
    errors: errors.map((error) => ({
      code: error.info.code,
      message: error.info.message,
      timestamp: new Date().toISOString(),
      data: {
        ...error.data,
      },
    })),
  };
}

export function testErrorMessages(errors: Error[]): {
  errors: ErrorResponse[];
} {
  return {
    errors: errors.map((error) => ({
      code: error.info.code,
      message: error.info.message,
      timestamp: expect.any(String),
      data: {
        ...error.data,
      },
    })),
  };
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

export function errorMessagesFromValidator(errors: Result<ValidatorError>): {
  errors: ErrorResponse[];
} {
  return {
    errors: errors.array().map((error: ValidatorError) => {
      const msg =
        typeof error.msg === 'string' ? JSON.parse(error.msg) : error.msg;
      return {
        code: msg.code,
        message: msg.message,
        timestamp: new Date().toISOString(),
        data: {
          path: error.path,
          location: error.location,
        },
      };
    }),
  };
}

export class CustomValidationError extends Error {
  constructor(info: { code: string; message: string }) {
    super(JSON.stringify(info));
    this.name = 'CustomValidationError';
  }
}
