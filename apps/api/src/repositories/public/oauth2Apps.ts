import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function createOAuth2App(
    name: string,
    organizationId: number,
    projectId: number | null,
    redirectUrl: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    id: number,
    client_id: string,
    client_secret: string
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                INSERT INTO public.oauth2_apps (
                    name,
                    organization_id,
                    project_id,
                    redirect_url
                ) VALUES (
                    $1::citext,
                    $2::integer,
                    $3::integer,
                    $4::text
                ) RETURNING id, client_id, client_secret;
            `,
            name: 'public-create-oauth2-app'
        },
        [
            name,
            organizationId,
            projectId,
            redirectUrl
        ]
    );
}
