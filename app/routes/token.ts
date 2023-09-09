import { Router, Response } from 'express';
import { errorMessages } from '../services/messageBuilderService';
import db from '../database';
import generateAccessToken from '../services/jwtService';
import { Request } from 'express-jwt';
import { INTERNAL_ERROR, INVALID_TOKEN } from '../constants/errors';
import { 
    checkTokenGrantType, 
    transformJwtErrorMessages, 
    validateRefreshToken 
} from '../middlewares/jwtMiddleware';

const router = Router();

router.post('/', [
    validateRefreshToken,
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const token = req.auth;

    try {
        const { rowCount } = await db.query(`
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1::uuid AND grant_type = 'sign_in' AND token = $2::uuid AND session_id = $3::uuid;
        `, [token?.sub, token?.jti, token?.session_id]);

        if (rowCount === 0) return res.status(401).send(errorMessages([{
            info: INVALID_TOKEN
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    } 

    res.json(await generateAccessToken({ 
        sub: token?.sub 
    }));
});

export default router;
