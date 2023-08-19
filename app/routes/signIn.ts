import { 
    Router, 
    Request, 
    Response 
} from 'express';
import db from '../database';
import { body, validationResult } from 'express-validator';
import generateAccessToken from '../services/jwtService';
import { errorMessages, errorMessagesFromValidator } from '../services/messageBuilderService';

const router = Router();

router.post('/', [
    body('identifier')
        .notEmpty()
        .withMessage('IDENTIFIER_REQUIRED: Please provide username or email.'),
    body('password')
        .notEmpty()
        .withMessage('PASSWORD_REQUIRED: Please provide an password.')
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errorMessagesFromValidator(errors));
    }

    const { identifier, password } = req.body;

    const query = `
        SELECT u.id, p.username
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.user_id
        WHERE (u.email = $1 OR p.username = $1)
        AND u.encrypted_password = extensions.crypt($2, u.encrypted_password);
    `;

    const result = await db.query(query, [identifier, password]);

    if (result.rowCount === 0) {
        return res.status(400).json(errorMessages([{ 
            code: 'INVALID_CREDENTIALS', 
            message: 'Invalid credentials. Please check your username/email and password.' 
        }]));
    }

    const user = result.rows[0];

    const body = generateAccessToken({
        sub: user.id
    });

    res.send(body);
});

export default router;
