import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import db from '../database';
import { validateAccessToken } from '../middlewares/jwtMiddleware';
 
const router = Router();

router.post('/', validateAccessToken(), async (req: Request, res: Response) => {
    const query = `
        DELETE FROM auth.refresh_tokens
        WHERE user_id = $1 AND grant_type = 'signIn' AND session_id = $2
    `;
    
    const auth = req.auth;

    const result = await db.query(query, [auth?.sub, auth?.session_id]);

    if (result.rowCount === 0) {
        return res.status(404).send();
    }

    res.status(204).send();
});

router.post('/everywhere', validateAccessToken(), async (req: Request, res: Response) => {
    const query = `
        DELETE FROM auth.refresh_tokens
        WHERE user_id = $1 AND grant_type = 'signIn'
    `;

    const result = await db.query(query, [req.auth?.sub]);

    if (result.rowCount === 0) {
        return res.status(404).send();
    }

    res.status(204).send();
});

export default router;
