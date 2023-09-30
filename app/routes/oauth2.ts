import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import {
    transformJwtErrorMessages,
    validateAccessToken, 
    validateRefreshToken,
    checkTokenGrantType
} from '../middlewares/jwtMiddleware';
import db from '../database';
import { 
    CustomValidationError, 
    errorMessages, 
    message 
} from '../services/messageBuilderService';
import { body } from 'express-validator';
import { 
    ARRAY_REQUIRED, 
    CLIENT_ALREADY_CONNECTED, 
    CLIENT_ID_REQUIRED, 
    CLIENT_NOT_FOUND, 
    CLIENT_SECRET_REQUIRED, 
    CODE_REQUIRED, 
    CONNECTION_ALREADY_DELETED, 
    CONNECTION_ALREADY_REVOKED, 
    EMPTY_ARRAY, 
    GRANT_TYPE_REQUIRED, 
    INTERNAL_ERROR,
    INVALID_GRANT_TYPE, 
    INVALID_TOKEN, 
    INVALID_URL, 
    INVALID_UUID, 
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
import logger from '../loggers/logger';
import { verify } from 'jsonwebtoken';
import { AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from '../../env-config';

const router = Router();
 
router.post('/authorize', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('client_id')
        .notEmpty()
        .withMessage(CLIENT_ID_REQUIRED)
        .bail()
        .custom(value => {
            if (!validateUUID(value)) throw new CustomValidationError(INVALID_UUID);

            return true;
        }),
    body('redirect_url')
        .notEmpty()
        .withMessage(REDIRECT_URL_REQUIRED)
        .bail()
        .isURL()
        .withMessage(INVALID_URL),
    body('scopes')
        .notEmpty()
        .withMessage(SCOPES_REQUIRED)
        .bail()
        .isArray()
        .withMessage(ARRAY_REQUIRED)
        .bail()
        .custom(value => {
            if (value.length === 0) throw new CustomValidationError(EMPTY_ARRAY);

            return true;
        }),
    validate
], async (req: Request, res: Response) => {
    const { client_id, redirect_url, scopes } = req.body;

    try {
        const scopesStringified = JSON.stringify(scopes);

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
            scopesStringified
        ]);
        
        if (rowCount === 0) {
            logger.warn(`Client not found for client: ${client_id}, redirect url: ${redirect_url} and scopes: ${scopesStringified}`);
            return res.status(404).json(errorMessages([{ info: CLIENT_NOT_FOUND }]));
        }

        logger.info(`Client found with client: ${client_id}, redirect url: ${redirect_url} and scopes: ${scopesStringified}`);
    } catch (e) {
        logger.error(`Error while authorizing client: ${client_id}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
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
        
        if (rowCount !== 0) {
            logger.warn(`Client is already connected with user: ${userId}`);
            return res.status(400).json(errorMessages([{ info: CLIENT_ALREADY_CONNECTED }]));
        }
    } catch (e) {
        logger.error(`Error while checking client connection for user: ${userId} and client: ${client_id}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
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
    
        if (rowCount === 0) {
            logger.error(`Failed to insert/update authorization token for user: ${userId} and client: ${client_id}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        logger.info(`Authorization token inserted/updated successfully for user: ${userId} and client: ${client_id}`);
        
        tokenId = rows[0].id;
    } catch (e) {
        logger.error(`Error while inserting/updating authorization token for user: ${userId} and client: ${client_id}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
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

        logger.info(`Authorization token scopes inserted/updated successfully for token: ${tokenId}`);
    } catch (e) {
        logger.error(`Error while inserting/updating authorization token scopes for token: ${tokenId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    res.json({ code: token });
});

const possibleGrantTypes = [
    'client_credentials', 
    'authorization_code', 
    'refresh_token'
];

router.post('/token', [
    body('grant_type')
        .notEmpty()
        .withMessage(GRANT_TYPE_REQUIRED)
        .bail()
        .custom((value) => {
            if (!possibleGrantTypes.includes(value)) throw new CustomValidationError({ code: INVALID_GRANT_TYPE.code, message: INVALID_GRANT_TYPE.messages[1] });

            return true;
        }),
    body('client_id')
        .custom((value, { req }) => {
            if (!possibleGrantTypes.includes(req.body?.grant_type) || req.body?.grant_type === 'refresh_token' || req.body?.grant_type === undefined) return true;

            if (value === undefined || value.length === 0) throw new CustomValidationError(CLIENT_ID_REQUIRED);

            if (!validateUUID(value)) throw new CustomValidationError(INVALID_UUID);
            
            return true;
        }),
    body('client_secret')
        .custom((value, { req }) => {
            if (!possibleGrantTypes.includes(req.body?.grant_type) || req.body?.grant_type === 'refresh_token' || req.body?.grant_type === undefined) return true;

            if (value === undefined || value.length === 0) throw new CustomValidationError(CLIENT_SECRET_REQUIRED);

            return true;
         }),
    body('code')
        .custom((value, { req }) => {
            if (req.body?.grant_type !== 'authorization_code' || req.body?.grant_type === undefined) return true;

            if (value === undefined || value.length === 0) throw new CustomValidationError(CODE_REQUIRED);

            return true;
        }),
    body('refresh_token')
        .custom((value, { req }) => {
            if (req.body?.grant_type !== 'refresh_token' || req.body?.grant_type === undefined) return true;

            if (value === undefined || value.length === 0) throw new CustomValidationError(REFRESH_TOKEN_REQUIRED);

            if (req.body?.grant_type === 'refresh_token') {
                const token = req.body.refresh_token;

                verify(token, REFRESH_TOKEN_SECRET, { 
                    audience: AUDIENCE,
                    issuer: ISSUER,
                    algorithms: ['HS256']
                }, (e, decoded) => {
                    if (e) throw new CustomValidationError(INVALID_TOKEN);

                    if (typeof decoded === 'object' && 'grant_type' in decoded) {
                        if (decoded?.grant_type !== 'authorization_code') throw new CustomValidationError({ message: INVALID_GRANT_TYPE.messages[0], code: INVALID_GRANT_TYPE.code });
                    }

                    req.auth = decoded;
                });                
            }

            return true;
        }),
    validate
], async (req: Request, res: Response) => {
    const { grant_type } = req.body;
    
    logger.info(`OAuth2 Token Endpoint accessed with grant type: ${grant_type}`);

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
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const userId = req.auth?.sub;

    let result;

    try {
        const { rows } = await db.query(`
            SELECT
                jsonb_build_object(
                    'id', o.id,
                    'name', o.name,
                    'display_name', o.display_name
                ) AS organization,
                oa.description,
                oa.homepage_url,
                oa.client_id
            FROM
                auth.oauth2_connections AS oc
            JOIN
                public.oauth2_apps AS oa ON oc.client_id = oa.id
            JOIN
                public.organizations AS o ON oa.organization_id = o.id
            WHERE
                oc.user_id = $1::uuid;
        `, [userId]);

        result = rows;
    } catch (e) {
        logger.error(`Error while fetching connections for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`)
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Connections fetched successfully for user: ${userId}`);

    res.json(result);
});

router.delete('/connection', [
    validateAccessToken(),
    checkTokenGrantType('sign_in'),
    transformJwtErrorMessages,
    body('client_id')
        .notEmpty()
        .withMessage(CLIENT_ID_REQUIRED)
        .bail()
        .custom(value => {
            if (!validateUUID(value)) throw new CustomValidationError(INVALID_UUID);

            return true;
        }),
    validate
], async (req: Request, res: Response) => {
    const { client_id: clientId } = req.body;
    const userId = req.auth?.sub;

    try {
        const { rowCount } = await db.query(`
            WITH oauth2_connection_info AS (
                SELECT oc.refresh_token_id
                FROM auth.oauth2_connections AS oc
                JOIN public.oauth2_apps AS oa ON oc.client_id = oa.id
                WHERE oa.client_id = $1::uuid
                AND oc.user_id = $2::uuid
            )
            DELETE FROM auth.refresh_tokens AS rt
            WHERE rt.id IN (SELECT refresh_token_id FROM oauth2_connection_info);
        `, [clientId, userId]);

        if (rowCount === 0) {
            logger.warn(`No connection found for deletion for user: ${userId} and client: ${clientId}`);
            return res.status(404).json(errorMessages([{ info: CONNECTION_ALREADY_DELETED }]));
        }
    } catch (e) {
        logger.error(`Error while deleting connection for user: ${userId} and client: ${clientId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Connection deleted successfully for user: ${userId} and client: ${clientId}`);

    res.send(message('Connection successfully deleted.'));
});

router.delete('/revoke', [
    body('refresh_token')
        .notEmpty()
        .withMessage(REFRESH_TOKEN_REQUIRED),
    validate,
    validateRefreshToken,
    checkTokenGrantType('authorization_code'),
    transformJwtErrorMessages
], async (req: Request, res: Response) => {
    const token = req.auth;
    
    try {
        const { rowCount } = await db.query(`
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1::uuid AND grant_type = 'authorization_code' AND token = $2::uuid AND session_id IS NULL;
        `, [token?.sub, token?.jti]);

        if (rowCount === 0) {
            logger.warn(`No connection found for revocation for user: ${token?.sub}`);
            return res.status(404).json(errorMessages([{ info: CONNECTION_ALREADY_REVOKED }]));
        }
    } catch (e) {
        logger.error(`Error while revoking connection for user: ${token?.sub}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Connection revoked successfully for user: ${token?.sub}`);

    res.json(message('Connection successfully revoked.'));
});

export default router;
