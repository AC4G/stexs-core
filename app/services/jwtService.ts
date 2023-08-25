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

export default function generateAccessToken(additionalPayload: any, grantType: string = 'sign_in', refreshToken: boolean = true) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + JWT_EXPIRY_LIMIT;

    let sessionId = null;

    if (grantType === 'sign_in') additionalPayload.session_id = uuidv4();

    const accessToken = jwt.sign({
        iss: ISSUER,
        aud: AUDIENCE,
        ...additionalPayload,
        grant_type: grantType,
        iat,
        exp
    }, ACCESS_TOKEN_SECRET!);

    if (!refreshToken) return {
        access_token: accessToken,
        token_type: 'bearer',
        expires: exp
    }

    const jti = uuidv4();

    const insertQuery = `
        INSERT INTO auth.refresh_tokens (token, user_id, grant_type, session_id)
        VALUES ($1, $2, $3, $4)
    `;

    db.query(insertQuery, [jti, additionalPayload.sub, grantType, sessionId]);

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
