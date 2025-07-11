import type { PoolClient, QueryResult } from 'pg';
import { getQuery } from '../utils';

export async function updateConnectionScopes(
    userId: string,
    clientId: string,
    scopes: string[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
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

export async function checkConnectionScopes(
    clientId: string,
    requiredScopes: string[],
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
			text: `
				SELECT 1
				FROM public.oauth2_connection_scopes AS ocs
				JOIN public.oauth2_connections AS oc 
					ON ocs.connection_id = oc.id
				JOIN public.scopes AS s ON ocs.scope_id = s.id
				WHERE s.scope = ANY($2::varchar[])
					AND oc.client_id = $1::uuid
					AND oc.user_id = $3::uuid
					AND s.type = 'user'
				GROUP BY oc.client_id, oc.user_id
				HAVING COUNT(s.scope) = array_length($2::varchar[], 1);
			`,
			name: 'check-scopes-authorization-code'
		},
        [
            clientId,
            requiredScopes,
            userId
        ]
    );
}
