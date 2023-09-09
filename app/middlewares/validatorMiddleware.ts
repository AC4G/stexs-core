import { Result, validationResult } from "express-validator";
import { ValidatorError, errorMessagesFromValidator } from '../services/messageBuilderService';
import { 
    NextFunction, 
    Request, 
    Response 
} from "express";

export default function validate(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req) as Result<ValidatorError>;
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    return next();
}
