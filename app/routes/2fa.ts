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
import { errorMessages, message } from '../services/messageBuilderService';
import { INTERNAL_ERROR } from '../constants/errors';
import sendEmail from '../services/emailService';

const router = Router();

router.get('/', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    //list all possible 2fa choices and if users has enabled them through boolean
});

router.post('/totp', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    //enable totp
});

router.post('/totp/disable', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    //disable totp
});

router.post('/email/disable', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    //disable email -> set to false (if totp is enabled)
});

router.post('/verify', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    //verify activation
});

router.post('/email/send-code', [
    validateSignInConfirmToken(),
    checkTokenGrantType('sign_in_confirm'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const sub = req.auth?.sub;
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
        `, [code, sub]);

        if (rowCount === 0) {
            logger.error(`User not found for 2FA code update for user: ${sub}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        email = rows[0].email;
    } catch (e) {
        logger.error(`Error while updating and fetching email for user: ${sub}. Error: ${(e instanceof Error) ? e.message : e}`);
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
