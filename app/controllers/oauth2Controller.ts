import { Response } from "express";
import { errorMessages } from "../services/messageBuilderService";
import { 
    CODE_EXPIRED,
    INTERNAL_ERROR, 
    INVALID_AUTHORIZATION_CODE, 
    INVALID_CLIENT_CREDENTIALS, 
    INVALID_REFRESH_TOKEN, 
    NO_CLIENT_SCOPES_SELECTED
} from "../constants/errors";
import db from "../database";
import { v4 as uuidv4 } from "uuid";
import generateAccessToken from "../services/jwtService";
import { Request } from "express-jwt";

export async function authorizationCodeController(req: Request, res: Response) {
    const { code, client_id: clientId, client_secret: clientSecret } = req.body;

    let userId, tokenId, scopes, organization_id; 

    try {
        const { rowCount, rows } = await db.query(`
            WITH app_info AS (
                SELECT id, organization_id
                FROM public.oauth2_apps
                WHERE client_id = $2::uuid
                AND client_secret = $3::text
            ),
            token_info AS (
                SELECT aot.id, aot.user_id, aot.created_at, ai.organization_id
                FROM auth.oauth2_authorization_tokens AS aot
                JOIN app_info AS ai ON aot.client_id = ai.id
                WHERE aot.token = $1::uuid
            ),
            token_scopes AS (
                SELECT STRING_TO_ARRAY(STRING_AGG(s.name, ','), ',') AS scopes
                FROM auth.oauth2_authorization_token_scopes AS aot
                JOIN public.scopes AS s ON aot.scope_id = s.id
                WHERE aot.token_id IN (SELECT id FROM token_info)
            )
            SELECT *
            FROM token_info
            CROSS JOIN token_scopes;
        `, [
            code, 
            clientId, 
            clientSecret
        ]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            code: INVALID_AUTHORIZATION_CODE.code,
            message: INVALID_AUTHORIZATION_CODE.message
        }]));

        const expiryDate = new Date(rows[0].created_at);
        expiryDate.setMinutes(expiryDate.getMinutes() + 5);

        if (expiryDate < new Date()) return res.status(400).json(errorMessages([{
            code: CODE_EXPIRED.code,
            message: CODE_EXPIRED.message
        }]));

        ({ id: tokenId, user_id: userId, scopes, organization_id } = rows[0]);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    try {
        await db.query(`
            DELETE FROM auth.oauth2_authorization_tokens
            WHERE id = $1::integer;
        `, [tokenId]);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const refreshToken = uuidv4();

    const body = await generateAccessToken({
        sub: userId,
        scopes,
        organization_id
    }, 'authorization_code', refreshToken);

    try {
        await db.query(`
            WITH app_info AS (
                SELECT id
                FROM public.oauth2_apps
                WHERE client_id = $2::uuid
            ),
            refresh_token_info AS (
                SELECT id
                FROM auth.refresh_tokens
                WHERE user_id = $3::uuid AND token = $1::uuid AND grant_type = 'authorization_code' AND session_id IS NULL
            )
            INSERT INTO auth.oauth2_connections (user_id, client_id, refresh_token_id)
            SELECT $3::uuid, id, (SELECT id FROM refresh_token_info)
            FROM app_info;
        `, [
            refreshToken, 
            clientId, 
            userId
        ]);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    res.json(body);
}

export async function clientCredentialsController(req: Request, res: Response) {
    const { client_id, client_secret } = req.body;

    let organization_id, scopes;
    
    try {
        const { rowCount, rows } = await db.query(`
            WITH app_info AS (
                SELECT id, organization_id
                FROM public.oauth2_apps
                WHERE client_id = $1::uuid
                AND client_secret = $2::text
            ),
            app_scopes AS (
                SELECT STRING_TO_ARRAY(STRING_AGG(s.name, ','), ',') AS scopes
                FROM app_info AS ai
                JOIN public.oauth2_app_scopes AS oas ON ai.id = oas.client_id
                JOIN public.scopes AS s ON oas.scope_id = s.id
                WHERE s.type = 'client'
            )
            SELECT organization_id, scopes
            FROM app_info
            CROSS JOIN app_scopes;
        `, [client_id, client_secret]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            code: INVALID_CLIENT_CREDENTIALS.code,
            message: INVALID_CLIENT_CREDENTIALS.message
        }]));

        ({ organization_id, scopes } = rows[0]);

        if (!scopes) return res.status(400).json(errorMessages([{
            code: NO_CLIENT_SCOPES_SELECTED.code,
            message: NO_CLIENT_SCOPES_SELECTED.message
        }]));
    } catch (e) {
        console.log({e})
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const body = generateAccessToken({
        organization_id,
        scopes
    }, 'client_credentials');

    res.json(body);
}

export async function refreshTokenController(req: Request, res: Response) {
    const { scopes, sub, project_id, jti } = req.auth!;

    try {
        const { rowCount } = await db.query(`
            SELECT 1
            FROM auth.refresh_tokens
            WHERE token = $1::uuid AND user_id = $2::uuid AND grant_type = 'authorization_code' AND session_id IS NULL;
        `, [jti, sub]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            code: INVALID_REFRESH_TOKEN.code,
            message: INVALID_REFRESH_TOKEN.message
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    const body = await generateAccessToken({
        sub,
        scopes,
        project_id
    }, 'authorization_code', null, jti);

    res.json(body);
}
