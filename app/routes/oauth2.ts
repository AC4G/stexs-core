import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import {
    checkTokenForSignInGrantType, 
    transformJwtErrorMessages,
    validateAccessToken, 
    isRefreshTokenValid
} from '../middlewares/jwtMiddleware';
import db from '../database';
import { errorMessages } from '../services/messageBuilderService';
import { body } from 'express-validator';
import { 
    ARRAY_REQUIRED, 
    CLIENT_ALREADY_CONNECTED, 
    CLIENT_ID_REQUIRED, 
    CLIENT_NOT_FOUND, 
    CLIENT_SECRET_REQUIRED, 
    CODE_REQUIRED, 
    EMPTY_ARRAY, 
    GRANT_TYPE_REQUIRED, 
    INTERNAL_ERROR, 
    INVALID_CLIENT_ID_FORMAT, 
    INVALID_GRANT_TYPE, 
    INVALID_URL, 
    REDIRECT_URL_REQUIRED, 
    REFRESH_TOKEN_REQUIRED, 
    SCOPES_REQUIRED
} from '../constants/errors';
import { v4 as uuidv4, validate as validateUUID } from 'uuid'; 
import validate from '../middlewares/validatorMiddleware';
import { 
    authorizationCodeController, 
    clientCredentialsController, 
    refreshTokenController
} from '../controllers/oauth2Controller';

const router = Router();

router.post('/authorize', [
    validateAccessToken(),
    checkTokenForSignInGrantType,
    transformJwtErrorMessages,
    body('client_id')
        .notEmpty()
        .withMessage(CLIENT_ID_REQUIRED.code + ': ' + CLIENT_ID_REQUIRED.message)
        .bail()
        .custom(value => {
            if (!validateUUID(value)) throw new Error(INVALID_CLIENT_ID_FORMAT.code + ': ' + INVALID_CLIENT_ID_FORMAT.message);

            return true;
        }),
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
            if (value.length === 0) throw new Error(EMPTY_ARRAY.code + ': ' + EMPTY_ARRAY.message);

            return true;
        }),
    validate
], async (req: Request, res: Response) => {
    const { client_id, redirect_url, scopes } = req.body;

    try {
        const { rowCount } = await db.query(`
            SELECT 1
            FROM public.oauth2_apps a
            WHERE a.client_id = $1::uuid
            AND a.redirect_url = $2::text
            AND NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text($3) AS obj(scope)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM public.oauth2_app_scopes ascs
                    JOIN public.scopes s ON ascs.scope_id = s.id
                    WHERE ascs.client_id = a.id
                        AND s.type = 'user'
                        AND obj.scope = s.name::text
                )
            );
        `, [
            client_id, 
            redirect_url, 
            JSON.stringify(scopes)
        ]);
        
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

    try {
        const { rowCount } = await db.query(`
            SELECT 1 FROM auth.oauth2_connections
            WHERE user_id = $1::uuid AND client_id = (
                SELECT id
                FROM public.oauth2_apps
                WHERE client_id = $2::uuid
            );
        `, [userId, client_id]);
        
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

    const token = uuidv4();
    let tokenId;

    try {
        const { rowCount, rows } = await db.query(`
            WITH app_info AS (
                SELECT id
                FROM public.oauth2_apps
                WHERE client_id = $3::uuid
            )
            INSERT INTO auth.oauth2_authorization_tokens (token, user_id, client_id)
            VALUES ($1::uuid, $2::uuid, (SELECT id FROM app_info))
            ON CONFLICT (user_id, client_id)
            DO UPDATE
            SET token = $1::uuid, created_at = CURRENT_TIMESTAMP
            RETURNING id;
        `, [
            token,
            userId, 
            client_id
        ]);
    
        if (rowCount === 0) return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));

        tokenId = rows[0].id;
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    try {
        await db.query(`
            WITH scope_ids AS (
                SELECT id
                FROM public.scopes
                WHERE name = ANY($2::text[])
            ),
            deleted_scopes AS (
                DELETE FROM auth.oauth2_authorization_token_scopes
                WHERE token_id = $1::integer
                AND scope_id NOT IN (SELECT id FROM scope_ids)
                RETURNING token_id
            )
            INSERT INTO auth.oauth2_authorization_token_scopes (token_id, scope_id)
            SELECT $1::integer, id
            FROM scope_ids
            ON CONFLICT DO NOTHING;
        `, [tokenId, scopes]);
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
    body('grant_type')
        .notEmpty()
        .withMessage(GRANT_TYPE_REQUIRED.code + ': ' + GRANT_TYPE_REQUIRED.message)
        .bail()
        .custom((value, { req }) => {
            const possibleGrantTypes = ['client_credentials', 'authorization_code', 'refresh_token'];

            if (!possibleGrantTypes.includes(value)) throw new Error(INVALID_GRANT_TYPE.code + ': ' + INVALID_GRANT_TYPE.messages[1]);

            return true;
        }),
    body('client_id')
        .custom((value, { req }) => {
            if (req.body?.grant_type === 'refresh_token' || req.body?.grant_type === undefined) return true;

            if (value === undefined || value.length === 0) throw new Error(CLIENT_ID_REQUIRED.code + ': ' + CLIENT_ID_REQUIRED.message);

            if (!validateUUID(value)) throw new Error(INVALID_CLIENT_ID_FORMAT.code + ': ' + INVALID_CLIENT_ID_FORMAT.message);
            
            return true;
        }),
    body('client_secret')
        .custom((value, { req }) => {
            if (req.body?.grant_type === 'refresh_token' || req.body?.grant_type === undefined) return true;

            if (value === undefined || value.length === 0) throw new Error(CLIENT_SECRET_REQUIRED.code + ': ' + CLIENT_SECRET_REQUIRED.message);

            return true;
         }),
    body('code')
        .custom((value, { req }) => {
            if (req.body?.grant_type !== 'authorization_code') return true;

            if (value === undefined || value.length === 0) throw new Error(CODE_REQUIRED.code + ': ' + CODE_REQUIRED.message);

            return true;
        }),
    body('refresh_token')
        .custom((value, { req }) => {
            if (req.body?.grant_type !== 'refresh_token') return true;

            if (value === undefined || value.length === 0) throw new Error(REFRESH_TOKEN_REQUIRED.code + ': ' + REFRESH_TOKEN_REQUIRED.message);

            if (req.body?.grant_type === 'refresh_token') isRefreshTokenValid(req, 'authorization_code');

            return true;
        }),
    validate
], async (req: Request, res: Response) => {
    const { grant_type } = req.body;
    
    switch (grant_type) {
        case 'authorization_code':
            authorizationCodeController(req, res);
            break;
        case 'client_credentials':
            clientCredentialsController(req, res);
            break;
        case 'refresh_token':
            refreshTokenController(req, res);
    }
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
