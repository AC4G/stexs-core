import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import { 
    checkTokenForSignInGrantType, 
    transformJwtErrorMessages,
    validateAccessToken 
} from '../middlewares/jwtMiddleware';
import db from '../database';
import { errorMessages, errorMessagesFromValidator } from '../services/messageBuilderService';
import { body, validationResult } from 'express-validator';
import { 
    ARRAY_REQUIRED, 
    CLIENT_ALREADY_CONNECTED, 
    CLIENT_ID_REQUIRED, 
    CLIENT_NOT_FOUND, 
    EMPTY_ARRAY, 
    INTERNAL_ERROR, 
    INVALID_URL, 
    REDIRECT_URL_REQUIRED, 
    SCOPES_REQUIRED
} from '../constants/errors';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/authorize', [
    validateAccessToken(),
    checkTokenForSignInGrantType,
    transformJwtErrorMessages,
    body('client_id')
        .notEmpty()
        .withMessage(CLIENT_ID_REQUIRED.code + ': ' + CLIENT_ID_REQUIRED.message),
    body('redirect_url')
        .notEmpty()
        .withMessage(REDIRECT_URL_REQUIRED.code + ': ' + REDIRECT_URL_REQUIRED.message)
        .bail()
        .isURL()
        .withMessage(INVALID_URL.code + ': ' + INVALID_URL.message),
    body('scopes')
        .notEmpty()
        .withMessage(SCOPES_REQUIRED.code + ': ' + SCOPES_REQUIRED.message)
        .bail()
        .isArray()
        .withMessage(ARRAY_REQUIRED.code + ': ' + ARRAY_REQUIRED.message)
        .bail()
        .custom(value => {
            if (value.length === 0) {
                throw new Error(EMPTY_ARRAY.code + ': ' + EMPTY_ARRAY.message);
            }

            return true;
        })
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errorMessagesFromValidator(errors));

    const { client_id, redirect_url, scopes } = req.body;
    
    const selectClientQuery = `
        SELECT 1
        FROM public.oauth2_apps a
        WHERE a.client_id = $1
        AND a.redirect_url = $2
        AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements($3) AS obj
            WHERE obj->>'name'::text NOT IN (
                SELECT s.name::text
                FROM public.oauth2_app_scopes as
                JOIN public.scopes s ON as.scope_id = s.id
                WHERE as.client_id = a.id
            )
        );
    `;

    try {
        const { rowCount } = await db.query(selectClientQuery, [client_id, redirect_url, JSON.stringify(scopes)]);

        if (rowCount === 0) return res.status(404).json(errorMessages([{
            code: CLIENT_NOT_FOUND.code,
            message: CLIENT_NOT_FOUND.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const userId = req.auth?.sub;

    const selectRefreshTokenQuery = `
        SELECT 1 FROM auth.oauth2_connections
        WHERE user_id = $1 AND client_id = $2
    `;

    try {
        const { rowCount } = await db.query(selectRefreshTokenQuery, [userId, client_id]);

        if (rowCount !== 0) return res.status(400).json(errorMessages([{
            code: CLIENT_ALREADY_CONNECTED.code,
            message: CLIENT_ALREADY_CONNECTED.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const query = `
        WITH token_insert AS (
            INSERT INTO auth.oauth2_authorization_tokens (token, user_id, client_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, client_id)
            DO DELETE
            RETURNING id
        )
        INSERT INTO auth.oauth2_authorization_token_scopes (token_id, scope_id)
        SELECT ti.id AS token_id, s.id AS scope_id
        FROM token_insert ti
        JOIN jsonb_array_elements($4) AS obj ON obj->>'name'::text = s.name::text
        JOIN public.scopes s ON true;
    `;

    const token = uuidv4();

    try {
        const { rowCount } = await db.query(query, [token, userId, client_id, scopes]);

        if (rowCount === 0) return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    res.json({
        code: token
    });
});

router.post('/token', [

], async (req: Request, res: Response) => {
    res.send({});
});

router.get('/connections', [
    validateAccessToken(),
    checkTokenForSignInGrantType,
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    res.send({});
});

router.delete('/connection', [
    validateAccessToken(),
    checkTokenForSignInGrantType,
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    res.send({});
});

router.post('/revoke', [

], async (req: Request, res: Response) => {
    res.send({});
});

export default router;
