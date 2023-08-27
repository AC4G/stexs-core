import { 
    Router, 
    Request, 
    Response 
} from 'express';
import db from '../database';
import { body, validationResult } from 'express-validator';
import generateAccessToken from '../services/jwtService';
import { errorMessages, errorMessagesFromValidator } from '../services/messageBuilderService';
import { 
    EMAIL_NOT_VERIFIED, 
    IDENTIFIER_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_CREDENTIALS, 
    PASSWORD_REQUIRED 
} from '../constants/errors';

const router = Router();

router.post('/', [
    body('identifier')
        .notEmpty()
        .withMessage(IDENTIFIER_REQUIRED.code + ': ' + IDENTIFIER_REQUIRED.message),
    body('password')
        .notEmpty()
        .withMessage(PASSWORD_REQUIRED.code + ': ' + PASSWORD_REQUIRED.message)
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    const { identifier, password } = req.body;

    const query = `
        SELECT u.id, u.email_verified_at, p.username
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.user_id
        WHERE u.encrypted_password = extensions.crypt($2, u.encrypted_password)
        AND (
            (CASE WHEN $1 ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN u.email ELSE p.username END) = $1
        )
    `;

    let id;

    try {
        const result = await db.query(query, [identifier, password]);

        if (result.rowCount === 0) return res.status(400).json(errorMessages([{ 
            code: INVALID_CREDENTIALS.code, 
            message: INVALID_CREDENTIALS.messages[0] 
        }]));

        if (!result.rows[0].email_verified_at) return res.status(400).json(errorMessages([{
            code: EMAIL_NOT_VERIFIED.code,
            message: EMAIL_NOT_VERIFIED.message
        }]));

        id = result.rows[0].id;
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const body = generateAccessToken({
        sub: id
    });

    res.send(body);
});

export default router;
