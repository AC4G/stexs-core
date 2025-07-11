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

    return query(
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

export async function getRedirectUrlAndScopesByClientId(
    clientId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    redirect_url: string;
    scopes: string[];
}>> {
    const query = getQuery(client);

    return query(
        {
            text: `
                SELECT 
                    oa.redirect_url,
                    COALESCE(
                        ARRAY_AGG(s.scope) FILTER (WHERE s.type = 'user'),
                        '{}'
                    ) AS scopes
                FROM public.oauth2_apps AS oa
                LEFT JOIN public.oauth2_app_scopes AS oas ON oa.id = oas.app_id
                LEFT JOIN public.scopes AS s ON oas.scope_id = s.id
                WHERE oa.client_id = $1::uuid
                GROUP BY oa.redirect_url;
            `,
            name: 'public-get-redirect-url-and-scopes-by-client-id'
        },
        [clientId]
    )
}

export async function validateClientCredentials(
    clientId: string,
    clientSecret: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    scope_ids: number[] | null;
    organization_id: number;
}>> {
    const query = getQuery(client);

    return query(
        {
            text: `
                SELECT 
                    oa.organization_id,
                    ARRAY_AGG(s.id) AS scope_ids
                FROM public.oauth2_apps AS oa
                LEFT JOIN public.oauth2_app_scopes AS oas ON oa.id = oas.app_id
                LEFT JOIN public.scopes AS s ON oas.scope_id = s.id
                WHERE oa.client_id = $1::uuid
                    AND oa.client_secret = $2::text
                    AND s.type = 'client'
                GROUP BY oa.organization_id;
            `,
            name: 'public-validate-client-credentials'
        },
        [clientId, clientSecret],
    );
}
