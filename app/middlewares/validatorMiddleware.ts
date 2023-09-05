import { validationResult } from "express-validator";
import { errorMessagesFromValidator } from '../services/messageBuilderService';
import { 
    NextFunction, 
    Request, 
    Response 
} from "express";

export default function validate(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    return next();
}
