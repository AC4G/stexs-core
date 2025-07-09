import { Response } from "express";
import { message } from "utils-node/messageBuilder";

type ErrorObject = {
  info: {
    code: string,
    message: string
  },
  data?: Record<string, any>
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

type Log = {
  message: string,
  meta: Record<string, any>
  level: LogLevel
};

class AppError extends Error {
  status: number;
  message: string;
  errors?: ErrorObject[];
  data?: Record<string, any>;
  log?: Log;
  stackTrace?: string;

  constructor({
    status,
    message,
    errors,
    data,
    log,
    captureStack = true
  }: {
    status: number;
    message: string;
    errors?: ErrorObject[];
    data?: Record<string, any>;
    log?: Log;
    captureStack?: boolean;
  }) {
    super(message);
    this.name = this.constructor.name;

    this.status = status;
    this.message = message;
    this.errors = errors;
    this.data = data;
    this.log = log;

    if (captureStack && Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
      this.stackTrace = this.stack;
    } else {
      this.stackTrace = new Error().stack;
    }
  }
}

export function transformAppErrorToResponse(err: AppError, res: Response): Response {
  return res.status(err.status).json(
    message(
      err.message,
      { ...err.data },
      err.errors
    )
  );
}

export default AppError;
