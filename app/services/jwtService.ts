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
import logger from '../loggers/logger';

export default async function generateAccessToken(additionalPayload: any, grantType: string = 'sign_in', refreshToken: string | null = null, oldRefreshToken: string | null = null) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + JWT_EXPIRY_LIMIT;

    if (grantType === 'sign_in') additionalPayload.session_id = uuidv4();

    logger.debug(`generateAccessToken called with payload: ${JSON.stringify(additionalPayload)}, grant type: ${grantType}${(refreshToken ? `, refresh token: ${refreshToken}` : '')}${(oldRefreshToken ? `, old refresh token: ${oldRefreshToken}` : '')}`);

    const accessToken = jwt.sign({
        iss: ISSUER,
        aud: AUDIENCE,
        ...additionalPayload,
        grant_type: grantType,
        iat, 
        exp
    }, ACCESS_TOKEN_SECRET!);

    logger.info(`Access token created for subject: ${additionalPayload.sub}`);

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

    try {
        if (oldRefreshToken && grantType === 'authorization_code') {
            await db.query(`
                UPDATE auth.refresh_tokens
                SET
                    token = $1::uuid,
                    updated_at = CURRENT_TIMESTAMP
                WHERE token = $2::uuid AND user_id = $3::uuid AND grant_type = 'authorization_code' AND session_id IS NULL;
            `, [jti, oldRefreshToken, additionalPayload.sub]);
    
            logger.info(`Refresh token updated for subject: ${additionalPayload.sub}`);
            logger.debug(`Refresh token updated for subject: ${additionalPayload.sub} and jti: ${jti}`);
        } else {
            await db.query(`
                INSERT INTO auth.refresh_tokens (token, user_id, grant_type, session_id)
                VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid);
            `, [jti, additionalPayload.sub, grantType, additionalPayload.session_id]);
    
            logger.info(`New refresh token created for subject: ${additionalPayload.sub}`);
            logger.debug(`New refresh token created for subject: ${additionalPayload.sub} and jti: ${jti}`);
        }
    } catch (e) {
        logger.error(`Database error in generateAccessToken: ${(e instanceof Error) ? e.message : e}`);
        logger.debug(`Database error in generateAccessToken for jti: ${jti}, subject: ${additionalPayload.sub}${(oldRefreshToken ? `, old refresh token: ${refreshToken}` : '')}${(additionalPayload.session_id ? `, session: ${additionalPayload.session_id}` : '')}. Error: ${(e instanceof Error) ? e.message : e}`);
        throw e;
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
