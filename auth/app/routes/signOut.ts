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
import logger from '../loggers/logger';
 
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

        if (rowCount === 0) {
            logger.warn(`Sign-out: No refresh tokens found for user: ${auth?.sub} and session: ${auth?.session_id}`);
            return res.status(404).send();
        }
    } catch (e) {
        logger.error(`Error during sign out for user: ${auth?.sub} and session: ${auth?.session_id}. Error:  ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Sign-out successful for user: ${auth?.sub} from session: ${auth?.session_id}`);

    res.status(204).send();
});

router.post('/everywhere', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const sub = req.auth?.sub;

    try {
        const { rowCount } = await db.query(`
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1::uuid AND grant_type = 'sign_in';
        `, [sub]);

        if (rowCount === 0) {
            logger.warn(`Sign-out from all sessions: No refresh tokens found for user: ${sub}`);
            return res.status(404).send();
        }
    } catch (e) {
        logger.error(`Sign-out from all sessions failed for user: ${sub}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Sign-out from all sessions successful for user: ${sub}`);

    res.status(204).send();
});

export default router;
