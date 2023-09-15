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
    NEW_PASSWORD_EQUALS_CURRENT, 
    PASSWORD_REQUIRED, 
    RECOVERY_LINK_EXPIRED, 
    TOKEN_REQUIRED 
} from '../constants/errors';
import { errorMessages, message } from '../services/messageBuilderService';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import sendEmail from '../services/emailService';
import { REDIRECT_TO_RECOVERY } from '../../env-config';
import validate from '../middlewares/validatorMiddleware';
import logger from '../loggers/logger';
import isExpired from '../services/isExpired';

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

        if (rowCount === 0) {
            logger.warn(`Invalid email for password recovery: ${email}`);
            return res.status(400).json(errorMessages([{
                info: {
                    code: INVALID_EMAIL.code,
                    message: INVALID_EMAIL.messages[0]
                },
                data: {
                    path: 'email',
                    location: 'body'
                }
            }]));
        }

        logger.info(`Email checked for password recovery: ${email}`);
    } catch (e) {
        logger.error(`Error while checking email for password recovery for email: ${email}. Error: ${(e instanceof Error) ? e.message : e}`);
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

        if (rowCount === 0) {
            logger.error(`Failed to update recovery token for email: ${email}`);
            return res.status(500).json(errorMessages([{
                info: INTERNAL_ERROR
            }]));
        }

        logger.info(`Recovery token successfully updated for email: ${email}`);
    } catch (e) {
        logger.error(`Error while updating recovery token for email: ${email}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    try {
        await sendEmail(email, 'Password Recovery', undefined, `You can change your password by following the link: ${REDIRECT_TO_RECOVERY + '?email=' + email + '&token=' + token}`);
    } catch (e) {
        logger.error(`Error while sending recovery email to ${email}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    logger.info(`Recovery email sent to: ${email}`);

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
        const { rowCount, rows } = await db.query(`
            SELECT recovery_sent_at FROM auth.users
            WHERE email = $1::text AND recovery_token = $2::uuid;
        `, [email, token]);

        if (rowCount === 0) {
            logger.warn(`Invalid request for password recovery confirmation with email: ${email}`);
            return res.status(400).json(errorMessages([{
                info: INVALID_REQUEST
            }]));
        }

        if (isExpired(rows[0].recovery_sent_at, 60)) {
            logger.warn(`Password recovery token expired for email: ${email}`);
            return res.status(403).json(errorMessages([{
                info: RECOVERY_LINK_EXPIRED
            }]));
        }

        logger.info(`Password recovery request confirmed for email: ${email}`);

        const { rows: data } = await db.query(`
            SELECT 
                CASE 
                    WHEN extensions.crypt($1::text, encrypted_password) = encrypted_password 
                    THEN true 
                    ELSE false 
                END AS is_current_password
            FROM auth.users
            WHERE email = $2::text;
        `, [password, email]);

        if (data[0].is_current_password) {
            logger.warn(`New password matches the current password for email: ${email}`);
            return res.status(400).json(errorMessages([{ info: NEW_PASSWORD_EQUALS_CURRENT, data: {
                path: 'password',
                location: 'body'
            } }]));
        }
    
        const { rowCount: count } = await db.query(`
            UPDATE auth.users
            SET 
                encrypted_password = extensions.crypt($1::text, extensions.gen_salt('bf')),
                recovery_token = NULL,
                recovery_sent_at = NULL
            WHERE email = $2::text;
        `, [password, email]);

        if (count === 0) {
            logger.error(`Failed to update password for email: ${email}`);
            return res.status(500).json(errorMessages([{
                info: INTERNAL_ERROR
            }]));
        }

        logger.info(`Password successfully recovered for email: ${email}`);

        res.json(message('Password successfully recovered.'));
    } catch (e) {
        logger.error(`Error while updating password for email: ${email}. Error: ${(e instanceof Error) ? e.message : e}`);
        res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }
});

export default router;
