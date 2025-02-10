import { PoolClient, type QueryResult } from "pg";
import { getQuery } from "../utils";

export async function createTestProject(
    client: PoolClient | undefined = undefined,
    organizationId: number,
    name: string = 'test-project',
	description: string | null = null,
	readme: string | null = null,
	email: string | null = null,
	url: string | null = null
): Promise<QueryResult<{
    id: number
}>> {
    const query = getQuery(client);

    return await query(
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
            name: 'public-create-test-project'
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
