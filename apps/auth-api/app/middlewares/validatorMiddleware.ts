import { Result, validationResult } from 'express-validator';
import { ValidatorError, errorMessagesFromValidator } from '../services/messageBuilderService';
import { 
	NextFunction, 
	Request, 
	Response 
} from 'express';
import logger from '../loggers/logger';

export default function validate(req: Request, res: Response, next: NextFunction) {
	const errors = validationResult(req) as Result<ValidatorError>;

	if (!errors.isEmpty()) {
		const errorCodes = errors.array().map(error => {
			const msg = typeof error.msg === 'string' ? JSON.parse(error.msg) : error.msg;
			return msg.code;
		}).join(', ');
		logger.warn(`Validation errors - Codes: ${errorCodes}`);

		return res.status(400).json(errorMessagesFromValidator(errors));
	}

	return next();
}
