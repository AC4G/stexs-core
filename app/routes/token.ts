import { 
    Router,
    Response, 
    NextFunction 
} from 'express';
import { errorMessages } from '../services/messageBuilderService';
import db from '../database';
import generateAccessToken from '../services/jwtService';
import { 
    AUDIENCE, 
    ISSUER, 
    REFRESH_TOKEN_SECRET 
} from '../../env-config';
import { expressjwt as jwt, Request } from 'express-jwt';

const router = Router();

router.post('/', [
    jwt({ 
        secret: REFRESH_TOKEN_SECRET, 
        audience: AUDIENCE,
        issuer: ISSUER,
        algorithms: ['HS256'],
        getToken: (req: Request) => {
            return req.body.refresh_token || null;
        }
    }),
    function(err: any, req: Request, res: Response, next: NextFunction){
        return res.status(err.status).json(errorMessages([{ 
            code: err.code.toUpperCase(), 
            message: err.message 
        }]));
    }
], async (req: Request, res: Response) => {
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
