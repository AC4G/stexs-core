import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function createOAuth2Connection(
    userId: string,
    clientId: string,
    scopeIds: number[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    id: number;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                WITH inserted_connection AS (
                    INSERT INTO public.oauth2_connections (user_id, client_id)
                    VALUES ($1::uuid, $2::uuid)
                    RETURNING id
                )
                INSERT INTO public.oauth2_connection_scopes (connection_id, scope_id)
                SELECT inserted_connection.id, scope_id
                FROM inserted_connection
                CROSS JOIN UNNEST($3::int[]) AS scope_id
                RETURNING connection_id AS id;      
            `,
            name: 'public-create-connection'
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

    return await query(
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
