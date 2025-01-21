import { PoolClient } from 'pg';
import { getQuery, type QueryResult } from '../utils';

export async function deleteRefreshToken(
    sub: string,
    jti: string,
    session_id: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    const { rowCount, rows } = await query(
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
            jti,
            session_id
        ],
    );

    return {
        rowCount,
        rows
    }
}
