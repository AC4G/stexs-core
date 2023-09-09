import { 
    Router, 
    Request, 
    Response 
} from 'express';
import db from '../database';
import { body } from 'express-validator';
import generateAccessToken from '../services/jwtService';
import { errorMessages } from '../services/messageBuilderService';
import { 
    EMAIL_NOT_VERIFIED, 
    IDENTIFIER_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_CREDENTIALS, 
    PASSWORD_REQUIRED 
} from '../constants/errors';
import validate from '../middlewares/validatorMiddleware';

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

    let id;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT u.id, u.email_verified_at, p.username
            FROM auth.users u
            LEFT JOIN public.profiles p ON u.id = p.user_id
            WHERE u.encrypted_password = extensions.crypt($2::text, u.encrypted_password)
            AND (
                (CASE WHEN $1::text ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN u.email ELSE p.username END) = $1
            );
        `, [identifier, password]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{ 
            info: {
                code: INVALID_CREDENTIALS.code, 
                message: INVALID_CREDENTIALS.messages[0]
            } 
        }]));

        if (!rows[0].email_verified_at) return res.status(400).json(errorMessages([{
            info: EMAIL_NOT_VERIFIED
        }]));

        id = rows[0].id;
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    res.json(await generateAccessToken({
        sub: id
    }));
});

export default router;
