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
    if (!errors.isEmpty()) {
        return res.status(400).json(errorMessagesFromValidator(errors));
    }

    const { identifier, password } = req.body;

    const query = `
        SELECT u.id, u.verification_sent_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.user_id
        WHERE (u.email = $1 OR p.username = $1)
        AND u.encrypted_password = extensions.crypt($2, u.encrypted_password);
    `;

    const result = await db.query(query, [identifier, password]);

    if (result.rowCount === 0) {
        return res.status(400).json(errorMessages([{ 
            code: INVALID_CREDENTIALS.code, 
            message: INVALID_CREDENTIALS.messages[0] 
        }]));
    }

    if (result.rows[0].verification_sent_at) {
        return res.status(400).json(errorMessages([{
            code: EMAIL_NOT_VERIFIED.code,
            message: EMAIL_NOT_VERIFIED.message
        }]));
    }

    const body = generateAccessToken({
        sub: result.rows[0].id
    });

    res.send(body);
});

export default router;
