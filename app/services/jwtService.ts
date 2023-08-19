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

export default function generateAccessToken(additionalPayload: any, deleteRefreshToken: boolean = true, refreshToken: boolean = true) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + JWT_EXPIRY_LIMIT;

    if (deleteRefreshToken && additionalPayload.grant_type !== 'client_credentials') {
        const deleteQuery = `
            DELETE FROM auth.refresh_tokens
            WHERE user_id = $1 AND grant_type = $2
        `;

        db.query(deleteQuery, [additionalPayload.sub, 'signIn'])
    }

    const accessToken = jwt.sign({
        iss: ISSUER,
        aud: AUDIENCE,
        ...additionalPayload,
        iat,
        exp
    }, ACCESS_TOKEN_SECRET!);

    if (!refreshToken) {
        return {
            access_token: accessToken,
            token_type: 'bearer',
            expires: exp
        }
    }

    const jti = uuidv4();

    const insertQuery = `
        INSERT INTO auth.refresh_tokens (token, user_id, grant_type)
        VALUES ($1, $2, $3)
    `;

    db.query(insertQuery, [jti, additionalPayload.sub, 'signIn']);

    return {
        access_token: accessToken,
        refresh_token: jwt.sign({
            iss: ISSUER,
            aud: AUDIENCE,
            ...additionalPayload,
            iat,
            jti
        }, REFRESH_TOKEN_SECRET!),
        token_type: 'bearer',
        expires: exp,

    };
}
