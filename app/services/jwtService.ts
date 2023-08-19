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

export default function generateAccessToken(additionalPayload: any, refreshToken: boolean = true) {
    const iat = new Date().getTime();
    const exp = new Date((iat + JWT_EXPIRY_LIMIT)).getTime();

    if (additionalPayload.grant_type !== 'client_credentials') {
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
            accessToken,
            exp
        }
    }

    const jti = uuidv4();

    const insertQuery = `
        INSERT INTO auth.refresh_tokens (token, user_id, grant_type)
        VALUES ($1, $2, $3)
    `;

    db.query(insertQuery, [jti, additionalPayload.sub, 'signIn']);

    return {
        accessToken,
        refershToken: jwt.sign({
            iss: ISSUER,
            aud: AUDIENCE,
            ...additionalPayload,
            iat,
            jti
        }, REFRESH_TOKEN_SECRET!),
        exp
    };
}
