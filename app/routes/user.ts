import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import { 
    transformJwtErrorMessages, 
    validateAccessToken, 
    checkTokenGrantType 
} from '../middlewares/jwtMiddleware';
import db from '../database';
import { body } from 'express-validator';
import { 
    EMAIL_CHANGE_LINK_EXPIRED,
    EMAIL_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_EMAIL, 
    INVALID_PASSWORD, 
    INVALID_TOKEN, 
    NEW_PASSWORD_EQUALS_CURRENT, 
    PASSWORD_CHANGE_FAILED, 
    PASSWORD_REQUIRED, 
    TOKEN_REQUIRED
} from '../constants/errors';
import { errorMessages, message } from '../services/messageBuilderService';
import { v4 as uuidv4 } from 'uuid';
import sendEmail from '../services/emailService';
import { REDIRECT_TO_EMAIL_CHANGE } from '../../env-config';
import validate from '../middlewares/validatorMiddleware';
import logger from '../loggers/logger';
import isExpired from '../services/isExpiredService';

const router = Router();

router.get('/', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;

    try {
        const { rows } = await db.query(`
            SELECT 
                id, 
                email, 
                raw_user_meta_data,
                created_at,
                updated_at 
            FROM auth.users
            WHERE id = $1::uuid;
        `, [userId]);

        logger.info(`User data retrieve successful for user: ${userId}`);

        res.json(rows[0]);
    } catch (e) {
        logger.error(`Error while fetching user data for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
});

router.post('/password', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED)
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`])[A-Za-z\d@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`]+$/)
        .withMessage(INVALID_PASSWORD),
    validate
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { password } = req.body;

    try {
        const { rows, rowCount } = await db.query(`
            SELECT 
                CASE 
                    WHEN extensions.crypt($1::text, encrypted_password) = encrypted_password 
                    THEN true 
                    ELSE false 
                END AS is_current_password
            FROM auth.users
            WHERE id = $2::uuid;
        `, [password, userId]);

        if (rowCount === 0) {
            logger.error(`Password change failed for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: PASSWORD_CHANGE_FAILED }]));
        }

        const isCurrentPassword = rows[0].is_current_password;

        if (isCurrentPassword) {
            logger.warn(`New password matches the current password for user: ${userId}`);
            return res.status(400).json(errorMessages([{ 
                info: NEW_PASSWORD_EQUALS_CURRENT, 
                data: {
                    path: 'password',
                    location: 'body'
                } 
            }]));
        }

        const { rowCount: count } = await db.query(`
            UPDATE auth.users
            SET
                encrypted_password = extensions.crypt($1::text, extensions.gen_salt('bf'))
            WHERE id = $2::uuid;
        `, [password, userId]);

        if (count === 0) {
            logger.error(`Password change failed for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: PASSWORD_CHANGE_FAILED }]));
        }
        
        logger.info(`Password change successful for user: ${userId}`);

        res.json(message('Password changed successfully.'));
    } catch (e) {
        logger.error(`Error while changing password for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
});

router.post('/email', [
    validateAccessToken(), 
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED)
        .bail()
        .isEmail()
        .withMessage({ code: INVALID_EMAIL.code, message: INVALID_EMAIL.messages[0] }),
    validate
], async (req: Request, res: Response) => {
    const { email: newEmail } = req.body;

    const userId = req.auth?.sub;
    const token = uuidv4();

    try{
        const { rowCount } = await db.query(`
            UPDATE auth.users
            SET 
                email_change = $1::text,
                email_change_sent_at = CURRENT_TIMESTAMP,
                email_change_token = $2::uuid
            WHERE id = $3::uuid;
        `, [
            newEmail, 
            token, 
            userId
        ]);

        if (rowCount === 0) {
            logger.error(`Email change failed for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        logger.info(`Email change initiated for user: ${userId}`);
    } catch (e) {
        logger.error(`Error during email change initiation for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
        await sendEmail(newEmail, 'Email Change Verification', undefined, `Please verify your email change by clicking the link: ${REDIRECT_TO_EMAIL_CHANGE + '?token=' + token}`);
    } catch (e) {
        logger.error(`Error sending email change verification link to email: ${newEmail}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Email change verification link sent to ${newEmail}`);

    res.json(message('Email change verification link has been sent to the new email address.'));
});

router.post('/email/verify', [
    validateAccessToken(), 
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('token')
        .notEmpty()
        .withMessage(TOKEN_REQUIRED),
    validate
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { token } = req.body;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT email_change_sent_at 
            FROM auth.users
            WHERE id = $1::uuid AND email_change_token = $2::text
        `, [userId, token]);

        if (rowCount === 0) {
            logger.warn(`Email verification failed for user: ${userId}`);
            return res.status(400).json(errorMessages([{ info: INVALID_TOKEN }]));
        }

        if (isExpired(rows[0].email_change_sent_at, 60 * 24)) {
            logger.warn(`Email change link expired for user: ${userId}`);
            return res.status(403).json(errorMessages([{ info: EMAIL_CHANGE_LINK_EXPIRED }]));
        }

        const { rowCount: count } = await db.query(`
            UPDATE auth.users
            SET
                email = email_change,
                email_verified_at = CURRENT_TIMESTAMP,
                email_change = NULL,
                email_change_sent_at = NULL,
                email_change_token = NULL
            WHERE id = $1::uuid AND email_change_token = $2::text;
        `, [userId, token]);

        if (count === 0) {
            logger.error(`Email verification failed for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }
    } catch (e) {
        logger.error(`Error during email verification for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Email successfully verified and changed for user: ${userId}`);

    res.json(message('Email successfully changed.'));
});

export default router;
