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

const router = Router();

router.post('/', [
    body('username')
        .notEmpty()
        .withMessage('USERNAME_REQUIRED: Please provide a username.')
        .bail()
        .isLength({ max: 100 })
        .withMessage('INVALID_USERNAME: Username can be maximum 100 characters long.')
        .custom((value: string) => {
            if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)) {
                throw new Error('INVALID_USERNAME: Username cannot look like an email address!');
            }

            return true;
        }),
    body('email')
        .notEmpty()
        .withMessage('EMAIL_REQUIRED: Please provide an email.')
        .bail()
        .isEmail()
        .withMessage('INVALID_EMAIL: Please enter a valid email address.'),
    body('password')
        .notEmpty()
        .withMessage('PASSWORD_REQUIRED: Please provide an password.')
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$/)
        .withMessage('INVALID_PASSWORD: Your password must contain at least one uppercase letter, one lowercase letter, one number, and one special character!')
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
                    code: 'INVALID_INPUT_DATA', 
                    message: err.hint + '.', 
                    data: { path } 
                }])
            );
        }

        return res.status(400).json( 
            errorMessages([{ 
                code: 'INVALID_REQUEST', 
                message: 'Cannot process the request' 
            }])
        );
    }

    await sendEmail(email, 'Verification Email', undefined, `Please verify your email. ${ISSUER + '/verify-email?email=' + email + '&token=' + token}`);
});

export default router;
