import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function createItem(
    client: PoolClient | undefined = undefined,
    name: string,
    projectId: number,
    parameter: Record<string, any> = {},
    description: string | null = null,
    isPrivate: boolean = false
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                INSERT INTO public.items (
                    name,
                    parameter,
                    description,
                    project_id,
                    is_private
                ) VALUES (
                    $1::citext,
                    $2::jsonb,
                    $3::text,
                    $4::integer,
                    $5::boolean
                ) RETURNING id;
            `,
            name: 'public-create-item'
        },
        [
            name,
            parameter,
            description,
            projectId,
            isPrivate
        ]
    );
}

export async function isClientAllowedToAccessProjectByItemId(
    itemId: number,
    organizationId: number,
    clientId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                SELECT 1
                FROM public.items AS i
                JOIN public.projects AS p ON p.id = i.project_id
                JOIN public.oauth2_apps AS oa ON oa.client_id = $3::uuid
                JOIN public.organizations AS o ON o.id = p.organization_id
                WHERE i.id = $1::integer
                    AND (
                        oa.project_id = i.project_id OR
                        oa.project_id IS NULL
                    )
                    AND o.id = $2::integer;
            `,
            name: 'public-is-client-allowed-to-access-project-by-item-id'
        },
        [
            itemId,
            organizationId,
            clientId
        ]
    )
};
