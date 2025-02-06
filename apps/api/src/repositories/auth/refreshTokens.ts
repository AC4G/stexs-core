import { PoolClient, Query } from 'pg';
import { getQuery, type QueryResult } from '../utils';

export async function deleteRefreshToken(
    sub: string,
    token: string,
    session_id: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text:`
                DELETE FROM auth.refresh_tokens
                WHERE user_id = $1::uuid 
                    AND grant_type = 'password' 
                    AND token = $2::uuid 
                    AND session_id = $3::uuid;
            `,
            name: 'auth-delete-refresh-token'
        },
        [
            sub,
            token,
            session_id
        ],
    );
}

export async function saveRefreshToken(
    token: string,
    userId: string,
    grantType: string,
    sessionId: string,
    connectionId: number | null,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                INSERT INTO auth.refresh_tokens (
                    token, 
                    user_id, 
                    grant_type, 
                    session_id,
                    connection_id
                )
                VALUES (
                    $1::uuid, 
                    $2::uuid, 
                    $3::text, 
                    $4::uuid,
                    $5::int
                );
            `,
            name: 'auth-save-refresh-token'
        },
        [
            token,
            userId,
            grantType,
            sessionId,
            connectionId,
        ],
    );
}

export async function updateAuthorizationCodeRefreshToken(
    token: string,
    oldRefreshToken: string,
    userId: string,
    connectionId: number,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.refresh_tokens
                SET
                    token = $1::uuid,
                    updated_at = CURRENT_TIMESTAMP
                WHERE token = $2::uuid 
                    AND user_id = $3::uuid 
                    AND grant_type = 'authorization_code'
                    AND connection_id = $4::integer
                    AND session_id IS NULL;
            `,
            name: 'auth-update-authorization-code-refresh-token'
        },
        [
            token,
            oldRefreshToken,
            userId,
            connectionId
        ],
    );
}

export async function signOutFromSession(
    userId: string,
    sessionId: string,
    client: PoolClient | undefined = undefined
) {
    const query = getQuery(client);

    return await query(
        {
            text: `
                DELETE FROM auth.refresh_tokens
                WHERE user_id = $1::uuid 
                    AND grant_type = 'password' 
                    AND session_id = $2::uuid;
            `,
            name: 'auth-sign-out-from-session'
        },
        [userId, sessionId],
    );
}

export async function signOutFromAllSessions(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                DELETE FROM auth.refresh_tokens
                WHERE user_id = $1::uuid 
                    AND grant_type = 'password';
            `,
            name: 'auth-sign-out-from-all-sessions'
        },
        [userId],
    );
}

export async function getActiveUserSessions(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text:`
                SELECT 1
                FROM auth.refresh_tokens
                WHERE user_id = $1::uuid
                    AND grant_type = 'password';
            `,
            name: 'auth-get-active-user-sessions'
        },
        [userId],
    );
}
