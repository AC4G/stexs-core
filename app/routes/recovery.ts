import { 
    Router, 
    Request,
    Response
} from 'express';
import { body, validationResult } from 'express-validator';
import { 
    EMAIL_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_EMAIL, 
    INVALID_PASSWORD, 
    INVALID_TOKEN, 
    PASSWORD_REQUIRED, 
    TOKEN_REQUIRED 
} from '../constants/errors';
import { 
    errorMessages, 
    errorMessagesFromValidator,
    message 
} from '../services/messageBuilderService';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import sendEmail from '../services/emailService';
import { REDIRECT_TO_RECOVERY } from '../../env-config';

const router = Router();

router.post('/', [
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.messages[0])
],async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    const { email } = req.body;

    const selectQuery = `
        SELECT 1 FROM auth.users
        WHERE email = $1
    `;

    const { rowCount } = await db.query(selectQuery, [email]);

    if (rowCount === 0) return errorMessages([{
        code: INVALID_EMAIL.code,
        message: INVALID_EMAIL.messages[0]
    }]);

    const token = uuidv4();

    const query = `
        UPDATE auth.users
        SET
            recovery_toke = $1
            recovery_sent_at = CURRENT_TIMESTAMP
        WHERE email = $2
    `;
    
    try {
        const result = await db.query(query, [token, email]);

        if (result.rowCount === 0) {
            return errorMessages([{
                code: INTERNAL_ERROR.code,
                message: INTERNAL_ERROR.message
            }]);
        }
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    try {
        await sendEmail(email, 'Password Recovery', undefined, `You can change your password by following the link: ${REDIRECT_TO_RECOVERY + '?email=' + email + '&token=' + token}`);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    res.json(message('Recovery email was been send.'));
});

router.post('/confirm', [
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.messages[0]),
    body('token')
        .notEmpty()
        .withMessage(TOKEN_REQUIRED.code + ': ' + TOKEN_REQUIRED.message),
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED.code + ': ' + PASSWORD_REQUIRED.message)
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`])[A-Za-z\d@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`]+$/)
        .withMessage(INVALID_PASSWORD.code + ': ' + INVALID_PASSWORD.message)
],async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    const { email, token, password } = req.body;

    const selectQuery = `
        SELECT 1 FROM auth.users
        WHERE email = $1 AND recovery_token = $2
    `

    try {
        const result = await db.query(selectQuery, [email, token]);

        if (result.rowCount === 0) {
            return errorMessages([{
                code: INVALID_TOKEN.code,
                message: INVALID_TOKEN.message
            }]);
        }
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const query = `
        UPDATE auth.users
        SET 
            encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
            recovery_token = NULL,
            recovery_sent_at = NULL
        WHERE email = $2
    `

    try {
        const result = await db.query(query, [password, email]);

        if (result.rowCount === 0) {
            return errorMessages([{
                code: INTERNAL_ERROR.code,
                message: INTERNAL_ERROR.message
            }]);
        }

        res.json(message('Password successfully recovered.'));
    } catch (e) {
        res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }
});

export default router;
