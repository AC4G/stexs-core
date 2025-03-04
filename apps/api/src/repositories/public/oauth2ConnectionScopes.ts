import type { PoolClient, QueryResult } from 'pg';
import { getQuery } from '../utils';

export async function updateConnectionScopes(
    userId: string,
    clientId: string,
    scopes: string[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                INSERT INTO public.oauth2_connection_scopes (connection_id, scope_id)
                SELECT
                    c.id,
                    s.id
                FROM public.oauth2_connections AS c
                JOIN public.scopes AS s ON s.scope = ANY($3::text[])
                WHERE c.user_id = $1::uuid
                    AND c.client_id = $2::uuid
                ON CONFLICT (connection_id, scope_id) DO NOTHING;
            `,
            name: 'public-update-connection-scopes'
        },
        [
            userId,
            clientId,
            scopes
        ],
    );
}
