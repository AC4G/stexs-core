import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function setAuthorizationCode(
    code: string,
    userId: string,
    clientId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    id: number;
    created_at: Date;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                WITH app_info AS (
                    SELECT id
                    FROM public.oauth2_apps
                    WHERE client_id = $3::uuid
                )
                INSERT INTO auth.oauth2_authorization_codes (code, user_id, app_id)
                VALUES ($1::uuid, $2::uuid, (SELECT id FROM app_info))
                ON CONFLICT (user_id, app_id)
                DO UPDATE
                SET code = $1::uuid, created_at = CURRENT_TIMESTAMP
                RETURNING id, created_at;
            `,
            name: 'auth-set-authorization-code'
        },
        [
            code, 
            userId,
            clientId
        ]
    );
}

export async function validateAuthorizationCode(
    code: string,
    clientId: string,
    clientSecret: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    id: number;
    user_id: string;
    scopes: number[];
    created_at: string;
    organization_id: number;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 
					aot.id,
					aot.user_id,
					aot.created_at,
					oa.organization_id,
					COALESCE(
                        (SELECT array_agg(scope_id)
                        FROM auth.oauth2_authorization_code_scopes
                        WHERE code_id = aot.id),
                        '{}'::integer[]
                    ) AS scopes
				FROM auth.oauth2_authorization_codes AS aot
				JOIN public.oauth2_apps AS oa ON aot.app_id = oa.id
				WHERE aot.code = $1::uuid
					AND oa.client_id = $2::uuid
					AND oa.client_secret = $3::text;
            `,
            name: 'auth-validate-authorization-code'
        },
        [
            code,
            clientId,
            clientSecret
        ]
    )
}

export async function deleteAuthorizationCode(
    codeId: number,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                DELETE FROM auth.oauth2_authorization_codes
				WHERE id = $1::integer;
            `,
            name: 'auth-delete-authorization-code'
        },
        [codeId]
    );
}
