import { Request, Response } from "express";
import { errorMessages } from "../services/messageBuilderService";
import { INTERNAL_ERROR, INVALID_AUTHORIZATION_CODE } from "../constants/errors";
import db from "../database";
import { v4 as uuidv4 } from "uuid";
import generateAccessToken from "../services/jwtService";

export async function authorizationCodeController(req: Request, res: Response) {
    const { code, client_id: clientId, client_secret: clientSecret } = req.body;

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
                SELECT aot.id, aot.user_id
                FROM auth.oauth2_authorization_tokens AS aot
                JOIN app_info AS ai ON aot.client_id = ai.id
                WHERE aot.token = $1::uuid
            ),
            token_scopes AS (
                SELECT STRING_TO_ARRAY(STRING_AGG(s.name, ','), ',') AS scopes
                FROM auth.oauth2_authorization_token_scopes AS aot
                JOIN public.scopes AS s ON aot.scope_id = s.id
                WHERE aot.token_id = (SELECT id FROM token_info)
            )
            SELECT *
            FROM token_info
            CROSS JOIN token_scopes;
        `, [code, clientId, clientSecret]);

        if (rowCount === 0) return res.status(400).json(errorMessages([{
            code: INVALID_AUTHORIZATION_CODE.code,
            message: INVALID_AUTHORIZATION_CODE.message
        }]));

        ({ id: tokenId, user_id: userId, scopes } = rows[0]);
    } catch (e) {
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    try {
        await db.query(`
            DELETE FROM auth.oauth2_authorization_tokens
            WHERE id = $1::integer
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
        scopes
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
                WHERE token = $1::uuid AND grant_type = 'authorization_code'
            )
            INSERT INTO auth.oauth2_connections (user_id, client_id, refresh_token_id)
            SELECT $3::uuid, id, (SELECT id FROM refresh_token_info)
            FROM app_info
        `, [refreshToken, clientId, userId]);
    } catch (e) {
        console.log({e});
        return res.status(500).json(errorMessages([{
            code: INTERNAL_ERROR.code,
            message: INTERNAL_ERROR.message
        }]));
    }

    res.json(body);
}

export async function clientCredentialsController(req: Request, res: Response) {
    const { client_id, client_secret } = req.body;
}

export async function refreshTokenController(req: Request, res: Response) {
    const { refresh_token } = req.body;
}
