import { 
    Router, 
    Request,
    Response
} from 'express';
import { errorMessages, message } from '../services/messageBuilderService';
import db from '../database';
import { body, query } from 'express-validator';
import { ISSUER, REDIRECT_TO_SIGN_IN } from '../../env-config';
import sendEmail from '../services/emailService';
import { 
    EMAIL_ALREADY_VERIFIED,
    EMAIL_NOT_FOUND,
    EMAIL_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_EMAIL, 
    TOKEN_REQUIRED 
} from '../constants/errors';
import { v4 as uuidv4 } from 'uuid';
import validate from '../middlewares/validatorMiddleware';

const router = Router();

router.get('/', [
    query('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED)
        .bail()
        .isEmail()
        .withMessage({ code: INVALID_EMAIL.code, message: INVALID_EMAIL.messages[0] }),
    query('token')
        .notEmpty()
        .withMessage(TOKEN_REQUIRED),
    validate
], async (req: Request, res: Response) => {
    const { email, token } = req.query;

    const signInURL = new URL(REDIRECT_TO_SIGN_IN);
    const source = 'verify';

    signInURL.searchParams.set('source', source);

    try {
        const { rowCount, rows: users } = await db.query(`
            SELECT id, email_verified_at FROM auth.users 
            WHERE email = $1::text AND verification_token = $2::uuid;
        `, [email, token]);

        if (users[0]?.email_verified_at) {
            signInURL.searchParams.append('code', 'error');
            signInURL.searchParams.append('message', 'Your email has been already verified');
    
            return res.redirect(302, signInURL.toString());
        }

        if (rowCount === 0) {
            signInURL.searchParams.append('code', 'error');
            signInURL.searchParams.append('message', 'Provided verification link is invalid');
    
            return res.redirect(302, signInURL.toString());
        }
    } catch (e) {
        console.log({e});
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    try {
        const { rowCount } = await db.query(`
            UPDATE auth.users
            SET 
                verification_token = NULL,
                verification_sent_at = NULL,
                email_verified_at = CURRENT_TIMESTAMP
            WHERE email = $1::text;
        `, [email]);

        if (rowCount === 0) return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    signInURL.searchParams.append('code', 'success');
    signInURL.searchParams.append('message', 'Email successfully verified');

    res.redirect(302, signInURL.toString());
});

router.post('/resend', [
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED)
        .bail()
        .isEmail()
        .withMessage({ code: INVALID_EMAIL.code, message: INVALID_EMAIL.messages[0] }),
    validate
], async (req: Request, res: Response) => {
    const email = req.body.email;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT id, email_verified_at FROM auth.users
            WHERE email = $1::text;
        `, [email]);

        if (rowCount === 0) return res.status(404).json(errorMessages([{ 
            info: EMAIL_NOT_FOUND
        }]));

        if (rows[0].email_confirmed_at) return res.status(400).json(errorMessages([{ 
            info: EMAIL_ALREADY_VERIFIED
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
                verification_token = $1::uuid,
                verification_sent_at = CURRENT_TIMESTAMP
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

    try{
        await sendEmail(email, 'Verification Email', undefined, `Please verify your email. ${ISSUER + '/verify?email=' + email + '&token=' + token}`);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    res.json(message(`New verification email has been sent to ${email}`));
});

export default router;
