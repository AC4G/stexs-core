import { 
    Router, 
    Request, 
    Response 
} from 'express';
import db from '../database';
import sendEmail from '../services/emailService';
import { 
    message, 
    errorMessages, 
    errorMessagesFromValidator 
} from '../services/messageBuilderService';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { ISSUER } from '../../env-config';
import { 
    EMAIL_REQUIRED, 
    INVALID_EMAIL, 
    INVALID_INPUT_DATA, 
    INVALID_PASSWORD, 
    INVALID_REQUEST, 
    INVALID_USERNAME, 
    PASSWORD_REQUIRED, 
    USERNAME_REQUIRED 
} from '../constants/errors';

const router = Router();

router.post('/', [
    body('username')
        .notEmpty()
        .withMessage(USERNAME_REQUIRED.code + ': ' +  USERNAME_REQUIRED.message)
        .bail()
        .isLength({ max: 100 })
        .withMessage(INVALID_USERNAME + ': ' + INVALID_USERNAME.messages[0])
        .custom((value: string) => {
            if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)) {
                throw new Error(INVALID_USERNAME + ': ' + INVALID_USERNAME.messages[1]);
            }

            return true;
        }),
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.message),
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED.code + ': ' + PASSWORD_REQUIRED.message)
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$/)
        .withMessage(INVALID_PASSWORD.code + ': ' + INVALID_PASSWORD.message)
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errorMessagesFromValidator(errors));
    }

    const { username, password, email } = req.body;
    const token = crypto.randomBytes(Math.ceil(16 / 2)).toString('hex').slice(0, 16);

    const query = `
        INSERT INTO auth.users (
            email, 
            encrypted_password, 
            raw_user_meta_data,
            verification_token,
            verification_sent_at
        )
        VALUES ($1, $2, $3::jsonb, $4, CURRENT_TIMESTAMP)
        RETURNING id;
    `;

    try {
        const result = await db.query(query, [
            email, 
            password, 
            { username },
            token
        ]);

        res.status(201).json( 
            message('Sign-up successful. Check your email for an verification link!', { 
                output: {
                    userId: result.rows[0].id
                } 
            })
        );
    } catch (error) {
        const err = error as { hint: string | null; };

        if (err.hint) {
            const path = err.hint.split(' ').pop()!;

            return res.status(400).json(
                errorMessages([{ 
                    code: INVALID_INPUT_DATA.code, 
                    message: err.hint + '.', 
                    data: { path } 
                }])
            );
        }

        return res.status(400).json( 
            errorMessages([{ 
                code: INVALID_REQUEST.code, 
                message: INVALID_REQUEST.message
            }])
        );
    }

    await sendEmail(email, 'Verification Email', undefined, `Please verify your email. ${ISSUER + '/verify-email?email=' + email + '&token=' + token}`);
});

export default router;
