import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import db from '../database';
import { 
    checkTokenGrantType, 
    transformJwtErrorMessages, 
    validateAccessToken 
} from '../middlewares/jwtMiddleware';
import { errorMessages } from '../services/messageBuilderService';
import { INTERNAL_ERROR } from '../constants/errors';
 
const router = Router();

router.post('/', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {    
    const auth = req.auth;

    try {
        const { rowCount } = await db.query(`
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1::uuid AND grant_type = 'sign_in' AND session_id = $2::uuid;
        `, [auth?.sub, auth?.session_id]);

        if (rowCount === 0) return res.status(404).send();
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    res.status(204).send();
});

router.post('/everywhere', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    try {
        const { rowCount } = await db.query(`
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1::uuid AND grant_type = 'sign_in';
        `, [req.auth?.sub]);

        if (rowCount === 0) return res.status(404).send();
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    res.status(204).send();
});

export default router;
