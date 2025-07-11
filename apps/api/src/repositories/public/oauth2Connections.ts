import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function createOAuth2Connection(
    userId: string,
    clientId: string,
    scopeIds: number[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    id: number;
    inserted_scopes_count: number;
}>> {
    const query = getQuery(client);

    return query(
        {
            text: `
                WITH inserted_connection AS (
                    INSERT INTO public.oauth2_connections (user_id, client_id)
                    VALUES ($1::uuid, $2::uuid)
                    RETURNING id
                ), inserted_scopes AS (
                    INSERT INTO public.oauth2_connection_scopes (connection_id, scope_id)
                    SELECT ic.id, s.id
                    FROM inserted_connection ic
                    CROSS JOIN UNNEST($3::int[]) AS scope_id
                    JOIN public.scopes s ON s.id = scope_id
                    RETURNING connection_id
                )
                SELECT ic.id, COUNT(*)::int AS inserted_scopes_count
                FROM inserted_connection ic
                LEFT JOIN inserted_scopes ON ic.id = inserted_scopes.connection_id
                GROUP BY ic.id;  
            `,
            name: 'public-create-oauth2-connection'
        },
        [
            userId,
            clientId,
            scopeIds
        ],
    );
}

export async function connectionExistsByUserIdAndClientId(
    userId: string,
    clientId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                SELECT 1
                FROM public.oauth2_connections
                WHERE 
                    user_id = $1::uuid 
                    AND client_id = $2::uuid;
            `,
            name: 'public-connection-exists-by-user-id-and-client-id'
        },
        [userId, clientId],
    );
}
