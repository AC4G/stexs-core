import type { PoolClient, QueryResult } from 'pg';
import { getQuery } from '../utils';

export async function insertOrUpdateAuthorizationCodeScopes(
    codeId: number,
    scopes: string[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                WITH scope_ids AS (
                    SELECT id
                    FROM public.scopes
                    WHERE name = ANY($2::text[])
                ),
                deleted_scopes AS (
                    DELETE FROM auth.oauth2_authorization_code_scopes
                    WHERE code_id = $1::integer
                        AND scope_id NOT IN (SELECT id FROM scope_ids)
                    RETURNING code_id
                )
                INSERT INTO auth.oauth2_authorization_code_scopes (code_id, scope_id)
                SELECT 
                    $1::integer, 
                    id
                FROM scope_ids
                ON CONFLICT DO NOTHING;
            `,
            name: 'auth-insert-or-update-authorization-code-scopes'
        },
        [codeId, scopes]
    );
}
