import { 
    Router, 
    Request,
    Response
} from 'express';
import { 
    errorMessages, 
    errorMessagesFromValidator, 
    message 
} from '../services/messageBuilderService';
import db from '../database';
import { 
    body, 
    query, 
    validationResult 
} from 'express-validator';
import { ISSUER, REDIRECT_TO_SIGN_IN } from '../../env-config';
import crypto from 'crypto';
import sendEmail from '../services/emailService';
import { 
    EMAIL_ALREADY_VERIFIED,
    EMAIL_NOT_FOUND,
    EMAIL_REQUIRED, 
    INVALID_EMAIL, 
    TOKEN_REQUIRED 
} from '../constants/errors';

const router = Router();

router.get('/', [
    query('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.message),
    query('token')
        .notEmpty()
        .withMessage(TOKEN_REQUIRED.code + ': ' + TOKEN_REQUIRED.message)
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errorMessagesFromValidator(errors));
    }

    const signInURL = new URL(REDIRECT_TO_SIGN_IN);
    const source = 'verify-email';

    signInURL.searchParams.set('source', source);

    const query = `
        SELECT id, verification_token, email_verified_ FROM auth.users 
        WHERE email = $1
    `;

    const result = await db.query(query, [req.query.email]);
    const user = result.rows[0];

    if (user?.email_verified_at) {
        signInURL.searchParams.append('code', 'error');
        signInURL.searchParams.append('message', 'Your email has been already verified');

        return res.redirect(302, signInURL.toString());
    }

    if (result.rowCount === 0 || user.verification_token !== req.query.token) {
        signInURL.searchParams.append('code', 'error');
        signInURL.searchParams.append('message', 'Provided verification link is invalid');

        return res.redirect(302, signInURL.toString());
    }

    const updateQuery = `
        UPDATE auth.users
        SET 
            verification_token = NULL,
            verification_sent_at = NULL,
            email_confirmed_at = NOW()
        WHERE id = $1;
    `;

    await db.query(updateQuery, [user.id]);

    signInURL.searchParams.append('code', 'success');
    signInURL.searchParams.append('message', 'Email successfully verified');

    return res.redirect(302, signInURL.toString());
});

router.post('/resend', [
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.message)
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errorMessagesFromValidator(errors));
    }

    const email = req.body.email;

    const query = `
        SELECT id, email_confirmed_at FROM auth.users
        WHERE email = $1
    `;

    const result = await db.query(query, [email]);

    if (result.rowCount === 0) {
        return res.status(404).json(errorMessages([{ 
            code: EMAIL_NOT_FOUND.code, 
            message: EMAIL_NOT_FOUND.message 
        }]));
    }

    if (result.rows[0].email_confirmed_at) {
        return res.status(400).json(errorMessages([{ 
            code: EMAIL_ALREADY_VERIFIED.code, 
            message: EMAIL_ALREADY_VERIFIED.message 
        }]));
    }

    const token = crypto.randomBytes(Math.ceil(16 / 2)).toString('hex').slice(0, 16);

    const updateQuery = `
        UPDATE auth.users
        SET 
            verification_token = $1,
            verification_sent_at = NOW()
        WHERE id = $2;
    `;

    db.query(updateQuery, [token, result.rows[0].id]);

    await sendEmail(email, 'Verification Email', undefined, `Please verify your email. ${ISSUER + '/verify-email?email=' + email + '&token=' + token}`);

    res.json(message(`New verification email has been sent to ${email}`));
});

export default router;
