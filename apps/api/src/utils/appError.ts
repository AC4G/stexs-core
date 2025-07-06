import { Response } from "express";
import { message } from "utils-node/messageBuilder";

type ErrorObject = {
  info: {
    code: string,
    message: string
  },
  data?: Record<string, any>
}

class AppError extends Error {
  constructor(
    public statusCode: number,
    public responseMessage: string,
    public errors: ErrorObject[],
    public data?: Record<string, any>
  ) {
    super(responseMessage);
  }
}

export function transformAppErrorToResponse(e: AppError, res: Response) {
  res.status(e.statusCode).json(
    message(e.responseMessage, {  ...e.data }, e.errors)
  );
}

export default AppError;
