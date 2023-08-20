import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import { errorMessages } from '../services/messageBuilderService';
import db from '../database';
import generateAccessToken from '../services/jwtService';
import { validateJWT } from '../middlewares/jwtValidationMiddleware';

const router = Router();

router.post('/', validateJWT(), async (req: Request, res: Response) => {
    const token = req.auth;

    const query = `
        DELETE FROM auth.refresh_tokens
        WHERE user_id = $1 AND grant_type = 'signIn' AND token = $2
    `;

    const result = await db.query(query, [token?.sub, token?.jti]);

    if (result.rowCount === 0) {
        return res.status(401).send(errorMessages([{
            code: 'INVALID_TOKEN',
            message: 'Invalid token provided.'
        }]));
    }

    res.status(200).json(generateAccessToken({ sub: token?.sub }, false));
});

export default router;
