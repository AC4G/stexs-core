import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function addScopesToApp(
    appId: number,
    scopeIds: number[],
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
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
