import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import { 
    transformJwtErrorMessages, 
    validateAccessToken, 
    checkTokenForSignInGrantType 
} from '../middlewares/jwtMiddleware';
import db from '../database';
import { body } from 'express-validator';
import { 
    EMAIL_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_EMAIL, 
    INVALID_PASSWORD, 
    INVALID_TOKEN, 
    PASSWORD_CHANGE_FAILED, 
    PASSWORD_REQUIRED, 
    TOKEN_REQUIRED, 
    USER_NOT_FOUND
} from '../constants/errors';
import { errorMessages, message } from '../services/messageBuilderService';
import { v4 as uuidv4 } from 'uuid';
import sendEmail from '../services/emailService';
import { REDIRECT_TO_EMAIL_CHANGE } from '../../env-config';
import validate from '../middlewares/validatorMiddleware';

const router = Router();

router.get('/', [
    validateAccessToken(),
    checkTokenForSignInGrantType,
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;

    try {
        const result = await db.query(`
            SELECT 
                id, 
                email, 
                raw_user_meta_data,
                created_at,
                updated_at 
            FROM auth.users
            WHERE id = $1::uuid;
        `, [userId]);

        if (result.rowCount === 0) return res.status(404).json(errorMessages([{
            code: USER_NOT_FOUND.code,
            message: USER_NOT_FOUND.message
        }]));

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }
});

router.post('/password', [
    validateAccessToken(),
    checkTokenForSignInGrantType,
    transformJwtErrorMessages,
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED.code + ': ' + PASSWORD_REQUIRED.message)
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`])[A-Za-z\d@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`]+$/)
        .withMessage(INVALID_PASSWORD.code + ': ' + INVALID_PASSWORD.message),
    validate
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { password } = req.body;

    try {
        const result = await db.query(`
            UPDATE auth.users
            SET
                encrypted_password = extensions.crypt($1::text, extensions.gen_salt('bf'))
            WHERE id = $2::uuid;
        `, [password, userId]);

        if (result.rowCount === 0) return res.status(500).json(errorMessages([{
            code: PASSWORD_CHANGE_FAILED.code,
            message: PASSWORD_CHANGE_FAILED.message
        }]));
        
        res.json(message('Password changed successfully.'));
    } catch (e) {
        res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }
});

router.post('/email', [
    validateAccessToken(), 
    checkTokenForSignInGrantType,
    transformJwtErrorMessages,
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.messages[0]),
    validate
], async (req: Request, res: Response) => {
    const { email: newEmail } = req.body;

    const userId = req.auth?.sub;
    const token = uuidv4();

    try{
        const result = await db.query(`
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

        if (result.rowCount === 0) return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    try {
        await sendEmail(newEmail, 'Email Change Verification', undefined, `Please verify your email change by clicking the link: ${REDIRECT_TO_EMAIL_CHANGE + '?token=' + token}`);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    res.json(message('Email change verification link has been sent to the new email address.'));
});

router.post('/email/verify', [
    validateAccessToken(), 
    checkTokenForSignInGrantType,
    transformJwtErrorMessages,
    body('token')
        .notEmpty()
        .withMessage(TOKEN_REQUIRED.code + ': ' + TOKEN_REQUIRED.message),
    validate
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { token } = req.body;

    try {
        const { rowCount } = await db.query(`
            UPDATE auth.users
            SET
                email = email_change,
                email_verified_at = CURRENT_TIMESTAMP,
                email_change = NULL,
                email_change_sent_at = NULL,
                email_change_token = NULL
            WHERE id = $1::uuid AND email_change_token = $2::text;
        `, [userId, token]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            code: INVALID_TOKEN.code,
            message: INVALID_TOKEN.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    res.json(message('Email successfully changed.'));
});

export default router;
