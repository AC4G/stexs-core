import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function addScopesToApp(
    appId: number,
    scopeIds: number[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                INSERT INTO public.oauth2_app_scopes (
                    app_id,
                    scope_id
                )
                SELECT $1::integer, UNNEST($2::integer[]);
            `,
            name: 'public-add-scopes-to-app'
        },
        [
            appId,
            scopeIds
        ]
    );
}

export async function checkClientScopes(
    clientId: string,
    requiredScopes: string[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
			text: `
				SELECT 1
				FROM public.oauth2_app_scopes AS oas
				JOIN public.oauth2_apps AS a ON oas.app_id = a.id
				JOIN public.scopes AS s ON oas.scope_id = s.id
				WHERE a.client_id = $1::uuid
					AND s.scope = ANY($2::varchar[])
					AND s.type = 'client'
				GROUP BY a.client_id
				HAVING COUNT(s.scope) = array_length($2::varchar[], 1);
			`,
			name: 'check-scopes-client-credentials'
		},
        [clientId, requiredScopes]
    )
}
