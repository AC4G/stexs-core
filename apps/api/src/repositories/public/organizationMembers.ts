import { PoolClient, type QueryResult } from "pg";
import { getQuery } from "../utils";

export async function joinUserToOrganization(
    userId: string,
    organizationId: number,
    role: string = 'Member',
    client: PoolClient | undefined = undefined,
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                INSERT INTO public.organization_members (
                    member_id,
                    organization_id,
                    role
                ) VALUES (
                    $1::uuid,
                    $2::integer,
                    $3::text
                );
            `,
            name: 'public-join-user-to-organization'
        },
        [
            userId,
            organizationId,
            role
        ]
    );
}

export async function isUserAdminOrOwnerOfOrganization(
    userId: string,
    organizationId: number,
    client: PoolClient | undefined = undefined,
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 1
                FROM public.organization_members
                WHERE member_id = $1::uuid 
                    AND organization_id = $2::integer 
                    AND role IN ('Admin', 'Owner');
            `,
            name: 'public-is-user-admin-or-owner-of-organization'
        },
        [userId, organizationId]
    );
}
