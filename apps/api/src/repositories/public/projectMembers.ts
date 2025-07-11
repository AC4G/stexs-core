import type { PoolClient, QueryResult } from 'pg';
import { getQuery } from '../utils';

export async function joinUserToProject(
    projectId: number,
    userId: string,
    role: string = 'Member',
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                INSERT INTO public.project_members (
                    project_id,
                    member_id,
                    role
                ) VALUES (
                    $1::integer,
                    $2::uuid,
                    $3::text 
                );
            `,
            name: 'public-join-user-to-project'
        },
        [
            projectId,
            userId,
            role
        ]
    );
}

export async function isUserAdminOrOwnerOfProject(
    userId: string,
    projectId: number,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                SELECT 1
                FROM public.project_members AS pm
                WHERE pm.member_id = $1::uuid 
                    AND pm.project_id = $2::integer 
                    AND pm.role IN ('Admin', 'Owner');
            `,
            name: 'public-is-user-admin-or-owner-of-project'
        },
        [userId, projectId]
    );
}

export async function isUserAdminOrOwnerOfProjectByItemId(
    userId: string,
    itemId: number,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return query(
        {
            text: `
                SELECT 1
                FROM public.project_members AS pm
                JOIN public.items AS i ON pm.project_id = i.project_id
                WHERE i.id = $1::integer 
                    AND pm.member_id = $2::uuid 
                    AND pm.role IN ('Admin', 'Owner');
            `,
            name: 'public-is-user-admin-or-owner-of-project-by-item-id'
        },
        [itemId, userId]
    );
}
