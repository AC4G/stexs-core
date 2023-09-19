import { 
    Router, 
    Request, 
    Response 
} from 'express';
import { Request as JWTRequest } from 'express-jwt';
import db from '../database';
import { body } from 'express-validator';
import generateAccessToken, { generateSignInConfirmToken } from '../services/jwtService';
import { CustomValidationError, errorMessages } from '../services/messageBuilderService';
import { 
    CODE_EXPIRED,
    CODE_REQUIRED,
    EMAIL_NOT_VERIFIED, 
    IDENTIFIER_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_CODE, 
    INVALID_CREDENTIALS, 
    INVALID_TYPE, 
    PASSWORD_REQUIRED,
    TYPE_REQUIRED,
    UNSUPPORTED_TYPE
} from '../constants/errors';
import validate from '../middlewares/validatorMiddleware';
import logger from '../loggers/logger';
import { 
    checkTokenGrantType, 
    transformJwtErrorMessages, 
    validateSignInConfirmToken 
} from '../middlewares/jwtMiddleware';
import isExpired from '../services/isExpiredService';

const router = Router();

router.post('/', [
    body('identifier')
        .notEmpty()
        .withMessage(IDENTIFIER_REQUIRED),
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED),
    validate
], async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    let uuid;
    let types;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT u.id, u.email_verified_at,
                    ARRAY_REMOVE(ARRAY[
                            CASE WHEN twofa.email = TRUE THEN 'email' END,
                            CASE WHEN twofa.totp = TRUE THEN 'totp' END
                    ], NULL) AS types
            FROM auth.users u
            LEFT JOIN public.profiles p ON u.id = p.user_id
            LEFT JOIN auth.twofa ON u.id = twofa.user_id
            WHERE u.encrypted_password = extensions.crypt($2::text, u.encrypted_password)
            AND (
                (CASE WHEN $1::text ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN u.email ELSE p.username END) = $1::text
            );
        `, [identifier, password]);

        if (rowCount === 0) {
            logger.warn(`Sign-in failed for user: ${identifier}`);
            return res.status(400).json(errorMessages([{ 
                info: {
                    code: INVALID_CREDENTIALS.code, 
                    message: INVALID_CREDENTIALS.messages[0]
                } 
            }]));
        }

        if (!rows[0].email_verified_at) {
            logger.warn(`Email not verified for user: ${identifier}`);
            return res.status(400).json(errorMessages([{ info: EMAIL_NOT_VERIFIED }]));
        }

        uuid = rows[0].id;
        types = rows[0].types;
    } catch (e) {
        logger.error(`Error during sign in for user: ${identifier}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const { token, expires } = generateSignInConfirmToken(uuid, types);

    logger.info(`Sign-in initialized for user: ${identifier}`);

    res.json({
        token,
        types,
        expires
    });
});

router.post('/confirm', [
    validateSignInConfirmToken(),
    checkTokenGrantType('sign_in_confirm'),
    transformJwtErrorMessages,
    body('code')
        .notEmpty()
        .withMessage(CODE_REQUIRED),
    body('type')
        .notEmpty()
        .withMessage(TYPE_REQUIRED)
        .bail()
        .custom(value => {
            const supportedTypes = ['totp', 'email'];

            if (!supportedTypes.includes(value)) throw new CustomValidationError(INVALID_TYPE);
            
            return true;
        }),
    validate
], async (req: JWTRequest, res: Response) => {
    const sub = req.auth?.sub!;
    const supportedTypes = req.auth?.types;
    const { type, code } = req.body;

    if (!supportedTypes.includes(type)) {
        logger.warn(`Unsupported 2FA type provided for user: ${sub}`);
        return res.status(400).json(errorMessages([{ info: UNSUPPORTED_TYPE }]));
    }

    switch (type) {
        case 'email': 
            try {
                const { rowCount, rows } = await db.query(`
                    SELECT code, code_sent_at
                    FROM auth.twofa
                    WHERE user_id = $1::uuid;
                `, [sub]);

                if (rowCount === 0) {
                    logger.error(`User not found for 2FA procedure for user: ${sub}`);
                    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
                }

                if (isExpired(rows[0].code_sent_at, 5)) {
                    logger.warn(`2FA code expired for user: ${sub}`);
                    return res.status(403).json(errorMessages([{ info: CODE_EXPIRED }]));
                }

                if (code !== rows[0].code) {
                    logger.warn(`Invalid 2FA code provided for user: ${sub}`);
                    return res.status(403).json(errorMessages([{ info: INVALID_CODE }]));
                }

                const { rowCount: count } = await db.query(`
                    UPDATE auth.twofa
                    SET
                        code = NULL,
                        code_sent_at = NULL
                    WHERE user_id = $1::uuid;
                `, [sub]);

                if (count === 0) logger.error(`No rows updated in 2FA code reset for user: ${sub}`);
            } catch (e) {
                logger.error(`Error during 2FA confirmation for user: ${sub}. Error: ${(e instanceof Error) ? e.message : e}`);
                return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
            }
            break;
        case 'totp': 
            
    }
 
    try {
        const body = await generateAccessToken({ 
            sub
        });

        res.json(body);

        logger.info(`New access token generated for user: ${sub}`);
    } catch (e) {
        res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Sign-in successful for user: ${sub}`);
});

export default router;
