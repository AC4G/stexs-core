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
    const { code, client_id, client_secret: clientSecret } = req.body;

    let userId, tokenId, scopes; 

    try {
        const { rowCount, rows } = await db.query(`
            WITH app_info AS (
                SELECT id
                FROM public.oauth2_apps
                WHERE client_id = $2::uuid
                AND client_secret = $3::text
            ),
            token_info AS (
                SELECT aot.id, aot.user_id, aot.created_at
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
            client_id, 
            clientSecret
        ]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            info: INVALID_AUTHORIZATION_CODE
        }]));

        const expiryDate = new Date(rows[0].created_at);
        expiryDate.setMinutes(expiryDate.getMinutes() + 5);

        if (expiryDate < new Date()) return res.status(400).json(errorMessages([{
            info: CODE_EXPIRED
        }]));

        ({ id: tokenId, user_id: userId, scopes } = rows[0]);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    try {
        await db.query(`
            DELETE FROM auth.oauth2_authorization_tokens
            WHERE id = $1::integer;
        `, [tokenId]);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    const refreshToken = uuidv4();

    const body = await generateAccessToken({
        sub: userId,
        scopes,
        client_id
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
            client_id, 
            userId
        ]);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    res.json(body);
}

export async function clientCredentialsController(req: Request, res: Response) {
    const { client_id, client_secret } = req.body;

    let scopes;
    
    try {
        const { rowCount, rows } = await db.query(`
            WITH app_info AS (
                SELECT id
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
            SELECT scopes
            FROM app_info
            CROSS JOIN app_scopes;
        `, [client_id, client_secret]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            info: INVALID_CLIENT_CREDENTIALS
        }]));

        scopes = rows[0].scopes;

        if (!scopes) return res.status(400).json(errorMessages([{
            info: NO_CLIENT_SCOPES_SELECTED
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    const body = await generateAccessToken({
        scopes,
        client_id
    }, 'client_credentials');

    res.json(body);
}

export async function refreshTokenController(req: Request, res: Response) {
    const { scopes, sub, client_id, jti } = req.auth!;

    try {
        const { rowCount } = await db.query(`
            SELECT 1
            FROM auth.refresh_tokens
            WHERE token = $1::uuid AND user_id = $2::uuid AND grant_type = 'authorization_code' AND session_id IS NULL;
        `, [jti, sub]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            info: INVALID_REFRESH_TOKEN
        }]));
    } catch (e) {
        return res.status(500).json(errorMessages([{
            info: INTERNAL_ERROR
        }]));
    }

    const body = await generateAccessToken({
        sub,
        scopes,
        client_id
    }, 'authorization_code', null, jti);

    res.json(body);
}
