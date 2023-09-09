import { 
    Router, 
    Request,
    Response
} from 'express';
import { body } from 'express-validator';
import { 
    EMAIL_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_EMAIL, 
    INVALID_PASSWORD, 
    INVALID_REQUEST, 
    PASSWORD_REQUIRED, 
    TOKEN_REQUIRED 
} from '../constants/errors';
import { errorMessages, message } from '../services/messageBuilderService';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import sendEmail from '../services/emailService';
import { REDIRECT_TO_RECOVERY } from '../../env-config';
import validate from '../middlewares/validatorMiddleware';

const router = Router();

router.post('/', [
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED)
        .bail()
        .isEmail()
        .withMessage({ code: INVALID_EMAIL.code, message: INVALID_EMAIL.messages[0] }),
    validate
],async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const { rowCount } = await db.query(`
            SELECT 1 FROM auth.users
            WHERE email = $1::text;
        `, [email]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            info: {
                code: INVALID_EMAIL.code,
                message: INVALID_EMAIL.messages[0]
            }
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    const token = uuidv4();
    
    try {
        const { rowCount } = await db.query(`
            UPDATE auth.users
            SET
                recovery_toke = $1::uuid
                recovery_sent_at = CURRENT_TIMESTAMP
            WHERE email = $2::text;
        `, [token, email]);

        if (rowCount === 0) return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    try {
        await sendEmail(email, 'Password Recovery', undefined, `You can change your password by following the link: ${REDIRECT_TO_RECOVERY + '?email=' + email + '&token=' + token}`);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    res.json(message('Recovery email was been send.'));
});

router.post('/confirm', [
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED)
        .bail()
        .isEmail()
        .withMessage({ code: INVALID_EMAIL.code, message: INVALID_EMAIL.messages[0] }),
    body('token')
        .notEmpty()
        .withMessage(TOKEN_REQUIRED),
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED)
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`])[A-Za-z\d@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`]+$/)
        .withMessage(INVALID_PASSWORD),
    validate
],async (req: Request, res: Response) => {
    const { email, token, password } = req.body;

    try {
        const { rowCount } = await db.query(`
            SELECT 1 FROM auth.users
            WHERE email = $1::text AND recovery_token = $2::uuid;
        `, [email, token]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            info: INVALID_REQUEST
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    try {
        const { rowCount } = await db.query(`
            UPDATE auth.users
            SET 
                encrypted_password = extensions.crypt($1::text, extensions.gen_salt('bf')),
                recovery_token = NULL,
                recovery_sent_at = NULL
            WHERE email = $2::text;
        `, [password, email]);

        if (rowCount === 0) return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));

        res.json(message('Password successfully recovered.'));
    } catch (e) {
        res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }
});

export default router;
