import jwt from 'jsonwebtoken';
import { 
    ACCESS_TOKEN_SECRET, 
    REFRESH_TOKEN_SECRET,
    ISSUER,
    AUDIENCE,
    JWT_EXPIRY_LIMIT
} from '../../env-config';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';

export default async function generateAccessToken(additionalPayload: any, grantType: string = 'sign_in', refreshToken: string | null = null, oldRefreshToken: string | null = null) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + JWT_EXPIRY_LIMIT;

    if (grantType === 'sign_in') additionalPayload.session_id = uuidv4();

    const accessToken = jwt.sign({
        iss: ISSUER,
        aud: AUDIENCE,
        ...additionalPayload,
        grant_type: grantType,
        iat, 
        exp
    }, ACCESS_TOKEN_SECRET!);

    if (grantType === 'client_credentials') return {
        access_token: accessToken,
        token_type: 'bearer',
        expires: exp
    };

    let jti;

    if (refreshToken) {
        jti = refreshToken;
    } else {
        jti = uuidv4();
    }

    if (oldRefreshToken && grantType === 'authorization_code') {
        await db.query(`
            UPDATE auth.refresh_tokens
            SET
                token = $1::uuid,
                updated_at = CURRENT_TIMESTAMP
            WHERE token = $2::uuid AND user_id = $3::uuid AND grant_type = 'authorization_code' AND session_id IS NULL;
        `, [jti, oldRefreshToken, additionalPayload.sub]);
    } else {
        await db.query(`
            INSERT INTO auth.refresh_tokens (token, user_id, grant_type, session_id)
            VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid);
        `, [jti, additionalPayload.sub, grantType, additionalPayload.session_id]);
    }

    return {
        access_token: accessToken,
        refresh_token: jwt.sign({
            iss: ISSUER,
            aud: AUDIENCE,
            ...additionalPayload,
            grant_type: grantType,
            iat,
            jti
        }, REFRESH_TOKEN_SECRET!),
        token_type: 'bearer',
        expires: exp
    };
}

export function isRefreshTokenValid(token: string): boolean {
    try {
        jwt.verify(token, REFRESH_TOKEN_SECRET, { 
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithms: ['HS256']
        });
    } catch (e) {
        return false;
    }

    return true;
}
