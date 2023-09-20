import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import { 
    checkTokenGrantType, 
    transformJwtErrorMessages,
    validateAccessToken, 
    validateSignInConfirmToken
} from '../middlewares/jwtMiddleware';
import db from '../database';
import generateCode from '../services/codeGeneratorService';
import logger from '../loggers/logger';
import { 
    CustomValidationError, 
    errorMessages, 
    message 
} from '../services/messageBuilderService';
import { 
    CODE_EXPIRED,
    CODE_REQUIRED,
    INTERNAL_ERROR, 
    INVALID_CODE, 
    INVALID_TYPE, 
    TOTP_ALREADY_ENABLED, 
    TWOFA_EMAIL_ALREADY_ENABLED, 
    TYPE_REQUIRED 
} from '../constants/errors';
import sendEmail from '../services/emailService';
import { body } from 'express-validator';
import validate from '../middlewares/validatorMiddleware';
import { verifyEmail, verifyTOTP } from '../controllers/2faController';
import { getTOTPForSettup, getTOTPForVerification } from '../services/totpService';
import isExpired from '../services/isExpiredService';

const router = Router();

router.get('/', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    let flows;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT email, totp FROM auth.twofa
            WHERE user_id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`2FA flows not found for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        flows = rows[0];
    } catch (e) {
        logger.error(`Error while fetching 2FA flows for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`2FA flows successfully retrieved for user: ${userId}`);

    res.json(flows);
});

router.post('/totp', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    let email;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT t.totp, u.email
            FROM auth.twofa AS t
            INNER JOIN auth.users AS u
            ON t.user_id = u.id
            WHERE t.user_id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`2FA TOTP status not found for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (rows[0].totp) {
            logger.warn(`2FA TOTP is already enabled for user: ${userId}`);
            return res.status(400).json(errorMessages([{ info: TOTP_ALREADY_ENABLED }]));
        }

        email = rows[0].email;
    } catch (e) {
        logger.error(`Error while fetching 2FA TOTP status for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const totp = getTOTPForSettup(email);
    const secret = totp.secret.base32;

    try {
        const { rowCount } = await db.query(`
            UPDATE auth.twofa
            SET
                totp_secret = $2::text
            WHERE user_id = $1::uuid;
        `, [userId, secret]);

        if (rowCount === 0) {
            logger.error(`Failed to set 2FA TOTP secret for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }
    } catch (e) {
        logger.error(`Error while updating 2FA TOTP secret for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const otpAuthUri = totp.toString();

    res.json({
        secret,
        otpAuthUri
    });
});

router.post('/totp/disable', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('code')
        .notEmpty()
        .withMessage(CODE_REQUIRED),
    validate
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { code } = req.body;
    let secret;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT totp, totp_secret
            FROM auth.twofa
            WHERE user_id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`Failed to fetch 2FA TOTP status and secret for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (!rows[0].totp) {
            logger.warn(`2FA TOTP is already disabled for user: ${userId}`);
            return res.status(400).json(errorMessages([{ info: TOTP_ALREADY_ENABLED }]));
        }

        secret = rows[0].totp_secret;
    } catch (e) {
        logger.error(`Error while fetching 2FA TOTP status and secret for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const totp = getTOTPForVerification(secret);

    if (totp.validate({ token: code, window: 1 })) {
        logger.warn(`Invalid code provided for 2FA TOTP for user: ${userId}`);
        return res.status(403).json(errorMessages([{ info: INVALID_CODE }]));
    }

    try {
        const { rowCount } = await db.query(`
            UPDATE auth.twofa
            SET
                totp = FALSE,
                totp_secret = NULL,
                totp_verified_at = NULL
            WHERE user_id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`Failed to update 2FA TOTP status, secret and timestamp for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }
    } catch (e) {
        logger.error(`Error while updating 2FA TOTP status, secret and timestamp for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Successfully disabled 2FA TOTP for user: ${userId}`);

    res.json(message('TOTP 2FA successfully disabled.'))
});

router.post('/email', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const code = generateCode(8);
    let email;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT
                t.email AS email_status,
                u.email
            FROM auth.users AS u
            LEFT JOIN auth.twofa AS t ON u.id = t.user_id
            WHERE u.id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`Failed to fetch 2FA email status and email for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (rows[0].email_status) {
            logger.warn(`2FA email is already enabled for user: ${userId}`);
            return res.status(400).json(errorMessages([{ info: TWOFA_EMAIL_ALREADY_ENABLED }]));
        }

        const { rowCount: count } = await db.query(`
            UPDATE auth.twofa
            SET
                code = $2::text,
                code_sent_at = CURRENT_TIMESTAMP
            WHERE user_id = $1::uuid;
        `, [userId, code]);

        if (count === 0) {
            logger.error(`Failed to update 2FA email code and timestamp for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        email = rows[0].email;
    } catch (e) {
        logger.error(`Error while fetching or updating 2FA email properties for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
        await sendEmail(email, `2FA activation code ${code}`, undefined, `Use this code ${code} to enable email 2FA`);
    } catch (e) {
        logger.error(`Error while sending 2FA activation code email to ${email}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`2FA activation code successfully sent to email: ${email}`);

    res.json(message('2FA activation code successfully send to users email.'));
});

router.post('/email/disable', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('code')
        .notEmpty()
        .withMessage(CODE_REQUIRED),
    validate
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const { code } = req.body;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT code, code_sent_at
            FROM auth.twofa
            WHERE user_id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`Failed to fetch 2FA email code and timestamp for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (code !== rows[0].code) {
            logger.warn(`Invalid 2FA code provided for user: ${userId}`);
            return res.status(403).json(errorMessages([{ info: INVALID_CODE }]));
        }

        if (isExpired(rows[0].code_sent_at, 5)) {
            logger.warn(`2FA code expired for user: ${userId}`);
            return res.status(403).json(errorMessages([{ info: CODE_EXPIRED }]));
        }

        const { rowCount: count } = await db.query(`
            UPDATE auth.twofa
            SET
                email = TRUE,
                code = NULL,
                code_sent_at = NULL
            WHERE user_id = $1::uuid;
        `, [userId]);

        if (count === 0) {
            logger.error(`Failed to update 2FA email status, code and timestamp for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }
    } catch (e) {
        logger.error(`Error during 2FA email confirmation for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Successfully disabled 2FA email for user: ${userId}`);

    res.json(message('Email 2FA successfully disabled.'))
});

router.post('/verify', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('type')
        .notEmpty()
        .withMessage(TYPE_REQUIRED)
        .bail()
        .custom(value => {
            const supportedTypes = ['totp', 'email'];

            if (!supportedTypes.includes(value)) throw new CustomValidationError(INVALID_TYPE);
            
            return true;
        }),
    body('code')
        .notEmpty()
        .withMessage(CODE_REQUIRED),
    validate
], async (req: Request, res: Response) => {
    const { type } = req.body;

    if (type === 'totp') {
        await verifyTOTP(req, res);
    }

    if (type === 'email') {
        await verifyEmail(req, res);
    }
});

router.post('/email/send-code', [
    validateSignInConfirmToken(),
    checkTokenGrantType('sign_in_confirm'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;
    const code = generateCode(8);
    let email;

    try {
        const { rowCount, rows } = await db.query(`
            WITH updated_twofa AS (
                UPDATE auth.twofa
                SET
                    code = $1::text,
                    code_sent_at = CURRENT_TIMESTAMP
                WHERE user_id = $2::uuid
                RETURNING user_id
            )
            SELECT u.email
            FROM auth.users u
            WHERE u.id = $2::uuid;
        `, [code, userId]);

        if (rowCount === 0) {
            logger.error(`User not found for 2FA code update for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        email = rows[0].email;
    } catch (e) {
        logger.error(`Error while updating and fetching email for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
        await sendEmail(email, `2FA code ${code}`, undefined, `Use this code ${code} to sign into your account`);
    } catch (e) {
        logger.error(`Error while sending 2FA code email to ${email}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`2FA code successfully sent to email: ${email}`);

    res.json(message('2FA code successfully send to users email.'));
})

export default router;
