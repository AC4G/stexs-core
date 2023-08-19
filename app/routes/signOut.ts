import { Router, Response, NextFunction } from 'express';
import { expressjwt as jwt, Request } from 'express-jwt';
import { 
    ACCESS_TOKEN_SECRET, 
    AUDIENCE, 
    ISSUER 
} from '../../env-config';
import { errorMessages } from '../services/messageBuilderService';
import db from '../database';

const router = Router();

router.post('/', [
    jwt({ 
        secret: ACCESS_TOKEN_SECRET, 
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithms: ['HS256']
     }),
    function(err: any, req: Request, res: Response, next: NextFunction){
        return res.status(err.status).json(errorMessages([{ 
            code: err.code.toUpperCase(), 
            message: err.message 
        }]));
    }
], async (req: Request, res: Response) => {
    const userId = req.auth.sub;

    const query = `
        DELETE FROM auth.refresh_tokens
        WHERE user_id = $1 AND grant_type = 'signIn'
    `;

    const result = await db.query(query, [userId]);

    if (result.rowCount === 0) {
        return res.status(404).send();
    }

    res.status(204).send();
});

export default router;
