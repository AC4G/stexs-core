import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function createOrganization(
    client: PoolClient | undefined = undefined,
    name: string,
    displayName: string | null = null,
    description: string | null = null,
    readme: string | null = null,
    email: string | null = null,
    url: string | null = null,
): Promise<QueryResult<{
    id: number
}>> {
    const query = getQuery(client); 

    return await query(
        {
            text: `
                INSERT INTO public.organizations (
                    name,
                    display_name,
                    description,
                    readme,
                    email,
                    url
                ) VALUES (
                    $1::citext,
                    $2::citext,
                    $3::text,
                    $4::text,
                    $5::text,
                    $6::text
                ) RETURNING id;
            `,
            name: 'public-create-organization'
        },
        [
            name,
            displayName,
            description,
            readme,
            email,
            url
        ]
    );
}
