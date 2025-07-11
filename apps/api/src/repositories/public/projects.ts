import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function createProject(
    client: PoolClient | undefined = undefined,
    organizationId: number,
    name: string,
	description: string | null = null,
	readme: string | null = null,
	email: string | null = null,
	url: string | null = null
): Promise<QueryResult<{
    id: number
}>> {
    const query = getQuery(client);

    return query(
        {
            text: `
                INSERT INTO public.projects (
                    organization_id,
                    name,
                    description,
                    readme,
                    email,
                    url
                ) VALUES (
                    $1::integer,
                    $2::citext,
                    $3::text,
                    $4::text,
                    $5::text,
                    $6::text
                ) RETURNING id;
            `,
            name: 'public-create-project'
        },
        [
            organizationId,
            name,
            description,
            readme,
            email,
            url
        ]
    );
}

export async function isClientAllowedToAccessProject(
    organizationId: number,
    projectId: number,
    clientId: string,
    client: PoolClient | undefined = undefined,
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                SELECT 1
                FROM public.projects AS p
                JOIN public.oauth2_apps AS oa ON oa.client_id = $3::uuid
                WHERE p.organization_id = $1::integer 
                    AND (
                        oa.project_id = $2::integer OR
                        oa.project_id IS NULL
                    )
                    AND p.id = $2::integer;
            `,
            name: 'public-is-client-allowed-to-access-project'
        },
        [
            organizationId,
            projectId,
            clientId
        ]
    )
}
