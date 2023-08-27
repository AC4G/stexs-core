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
import { ISSUER } from '../../env-config';
import { 
    EMAIL_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_EMAIL, 
    INVALID_INPUT_DATA, 
    INVALID_PASSWORD, 
    INVALID_USERNAME, 
    PASSWORD_REQUIRED, 
    USERNAME_REQUIRED 
} from '../constants/errors';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/', [
    body('username')
        .notEmpty()
        .withMessage(USERNAME_REQUIRED.code + ': ' +  USERNAME_REQUIRED.message)
        .bail()
        .isLength({ min: 1, max: 20 })
        .withMessage(INVALID_USERNAME.code + ': ' + INVALID_USERNAME.messages[0])
        .custom((value: string) => {
            if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)) {
              throw new Error(INVALID_USERNAME.code + ': ' + INVALID_USERNAME.messages[1])
            }

            return true;
        }),
    body('email')
        .notEmpty()
        .withMessage(EMAIL_REQUIRED.code + ': ' + EMAIL_REQUIRED.message)
        .bail()
        .isEmail()
        .withMessage(INVALID_EMAIL.code + ': ' + INVALID_EMAIL.messages[0]),
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED.code + ': ' + PASSWORD_REQUIRED.message)
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`])[A-Za-z\d@$!%*?&.><,\/?'";:\[\]{}=+\-_)('*^%$#@!~`]+$/)
        .withMessage(INVALID_PASSWORD.code + ': ' + INVALID_PASSWORD.message)
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    const { username, password, email } = req.body;
    const token = uuidv4();

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
    } catch (e) {
        const err = e as { hint: string | null; };

        if (err.hint) {
            const path = err.hint.split(' ').pop()!;

            return res.status(400).json(
                errorMessages([{ 
                    code: INVALID_INPUT_DATA.code, 
                    message: err.hint + '.', 
                    data: {
                        path,
                        location: 'body'
                    } 
                }])
            );
        }

        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    try {
        await sendEmail(email, 'Verification Email', undefined, `Please verify your email. ${ISSUER + '/verify?email=' + email + '&token=' + token}`);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }
});

export default router;
