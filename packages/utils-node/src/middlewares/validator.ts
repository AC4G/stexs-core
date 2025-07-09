import { Result, validationResult } from 'express-validator';
import { ValidatorError, errorMessagesFromValidator } from '../messageBuilder';
import {
	NextFunction,
	Request,
	Response
} from 'express';
import { Logger } from 'winston';

export function validate(logger: Logger): (req: any, res: Response, next: NextFunction) => void {
	return (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req) as Result<ValidatorError>;

		if (!errors.isEmpty()) {
			const errorCodes = errors
				.array()
				.map((error) => {
					const msg =
						typeof error.msg === 'string' ? JSON.parse(error.msg) : error.msg;
					return msg.code;
				});
			logger.debug('Request validation errors', { errorCodes: errorCodes});

			return res.status(400).json(errorMessagesFromValidator(errors));
		}

		return next();
	};
}
