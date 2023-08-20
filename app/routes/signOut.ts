import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import db from '../database';
import { validateJWT } from '../middlewares/jwtValidationMiddleware';
 
const router = Router();

router.post('/', validateJWT(), async (req: Request, res: Response) => {
    const query = `
        DELETE FROM auth.refresh_tokens
        WHERE user_id = $1 AND grant_type = 'signIn'
    `;

    const result = await db.query(query, [req.auth?.db]);

    if (result.rowCount === 0) {
        return res.status(404).send();
    }

    res.status(204).send();
});

export default router;
