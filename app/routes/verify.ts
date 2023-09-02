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

const router = Router();

router.get('/', [
    query('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.messages[0]),
    query('token')
        .notEmpty()
        .withMessage(TOKEN_REQUIRED.code + ': ' + TOKEN_REQUIRED.message)
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    const { email, token } = req.query;

    const signInURL = new URL(REDIRECT_TO_SIGN_IN);
    const source = 'verify';

    signInURL.searchParams.set('source', source);

    const selectQuery = `
        SELECT id, email_verified_at FROM auth.users 
        WHERE email = $1 AND verification_token = $2
    `;

    try {
        const { rowCount, rows: users } = await db.query(selectQuery, [email, token]);

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
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const query = `
        UPDATE auth.users
        SET 
            verification_token = NULL,
            verification_sent_at = NULL,
            email_verified_at = CURRENT_TIMESTAMP
        WHERE email = $1;
    `;

    try {
        const { rowCount } = await db.query(query, [email]);

        if (rowCount === 0) return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    signInURL.searchParams.append('code', 'success');
    signInURL.searchParams.append('message', 'Email successfully verified');

    res.redirect(302, signInURL.toString());
});

router.post('/resend', [
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.messages[0])
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    const email = req.body.email;

    const selectQuery = `
        SELECT id, email_verified_at FROM auth.users
        WHERE email = $1
    `;

    try {
        const { rowCount, rows } = await db.query(selectQuery, [email]);

        if (rowCount === 0) return res.status(404).json(errorMessages([{ 
            code: EMAIL_NOT_FOUND.code, 
            message: EMAIL_NOT_FOUND.message 
        }]));

        if (rows[0].email_confirmed_at) return res.status(400).json(errorMessages([{ 
            code: EMAIL_ALREADY_VERIFIED.code, 
            message: EMAIL_ALREADY_VERIFIED.message 
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }


    const token = uuidv4();

    const updateQuery = `
        UPDATE auth.users
        SET 
            verification_token = $1,
            verification_sent_at = CURRENT_TIMESTAMP
        WHERE email = $2;
    `;

    try {
        const { rowCount } = await db.query(updateQuery, [token, email]);

        if (rowCount === 0) return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    try{
        await sendEmail(email, 'Verification Email', undefined, `Please verify your email. ${ISSUER + '/verify?email=' + email + '&token=' + token}`);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    res.json(message(`New verification email has been sent to ${email}`));
});

export default router;
