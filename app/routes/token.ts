import { Router, Response } from 'express';
import { errorMessages } from '../services/messageBuilderService';
import db from '../database';
import generateAccessToken from '../services/jwtService';
import { Request } from 'express-jwt';
import { INVALID_TOKEN } from '../constants/errors';
import { 
    checkTokenForSignInGrantType, 
    transformJwtErrorMessages, 
    validateRefreshToken 
} from '../middlewares/jwtMiddleware';

const router = Router();

router.post('/', [
    validateRefreshToken(),
    checkTokenForSignInGrantType,
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const token = req.auth;

    const query = `
        DELETE FROM auth.refresh_tokens
        WHERE user_id = $1 AND grant_type = 'sign_in' AND token = $2
    `;

    const result = await db.query(query, [token?.sub, token?.jti]);

    if (result.rowCount === 0) return res.status(401).send(errorMessages([{
        code: INVALID_TOKEN.code,
        message: INVALID_TOKEN.message
    }]));

    res.status(200).json(generateAccessToken({ sub: token?.sub }));
});

export default router;
