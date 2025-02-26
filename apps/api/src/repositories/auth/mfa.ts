import type { PoolClient, QueryResult } from "pg";
import { getQuery } from "../utils";

export async function getMFAStatus(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    email: boolean;
    totp: boolean;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT
                    email,
                    CASE
                        WHEN totp_verified_at IS NOT NULL THEN TRUE
                    ELSE FALSE
                    END AS totp
                FROM auth.mfa
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-get-mfa-status'
        },
        [userId],
    );
}

export async function getTOTPInfoForEnabling(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    totp_verified_at: Date | null;
    email: string;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 
                    t.totp_verified_at,
                    u.email
                FROM auth.mfa AS t 
                INNER JOIN auth.users AS u ON t.user_id = u.id
                WHERE t.user_id = $1::uuid;
            `,
            name: 'auth-get-totp-info-for-enabling'
        },
        [userId],
    );
}

export async function setTOTPSecret(
    userId: string,
    secret: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.mfa
                SET
                    totp_secret = $2::text
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-set-totp-secret'
        },
        [userId, secret],
    );
}

export async function getEmailInfo(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    email: boolean;
    email_code: string | null;
    email_code_sent_at: Date | null;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 
                    email, 
                    email_code, 
                    email_code_sent_at
                FROM auth.mfa
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-get-email-info'
        },
        [userId],
    );
}

export async function finalizeEnablingEmailMFA(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.mfa
                SET
                    email = TRUE,
                    email_code = NULL,
                    email_code_sent_at = NULL
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-finalize-enabling-email-mfa'
        },
        [userId],
    );
}

export async function getTOTPInfoForDisabling(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    totp_verified_at: Date | null;
    email: boolean;
    totp_secret: string | null;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 
                    totp_verified_at, 
                    email, 
                    totp_secret
                FROM auth.mfa
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-get-totp-info-for-disabling'
        },
        [userId],
    );
}

export async function disableTOTPMethod(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.mfa
                SET
                    totp_secret = NULL,
                    totp_verified_at = NULL
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-disable-totp-method'
        },
        [userId],
    );
}

export async function getTOTPStatus(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    totp_verified_at: Date | null;
    totp_secret: string | null;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 
					totp_secret, 
					totp_verified_at
				FROM auth.mfa
				WHERE user_id = $1::uuid;
            `,
            name: 'auth-get-totp-status'
        },
        [userId],
    );
}

export async function verifyTOTPMethod(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.mfa
                SET
                    totp_verified_at = CURRENT_TIMESTAMP
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-verify-totp-method'
        },
        [userId],
    );
}

export async function setEmailCode(
    userId: string,
    code: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    email: string;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                WITH updated_mfa AS (
                    UPDATE auth.mfa
                    SET
                        email_code = $1::text,
                        email_code_sent_at = CURRENT_TIMESTAMP
                    WHERE user_id = $2::uuid
                    RETURNING user_id
                )
                SELECT u.email
                FROM auth.users u
                WHERE u.id = $2::uuid;
            `,
            name: 'auth-set-email-code'
        },
        [code, userId],
    );
}

export async function getEmailInfoForDisabling(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    email: boolean;
    totp_verified_at: string | null;
    email_code: string | null;
    email_code_sent_at: string | null;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 
					email, 
					totp_verified_at, 
					email_code, 
					email_code_sent_at
				FROM auth.mfa
				WHERE user_id = $1::uuid;
            `,
            name: 'auth-get-email-info-for-disabling'
        },
        [userId],
    );
}

export async function disableEmailMethod(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.mfa
                SET
                    email = FALSE,
                    email_code = NULL,
                    email_code_sent_at = NULL
                WHERE user_id = $1::uuid;
            `,
            name: 'auth-disable-email-method'
        },
        [userId],
    );
}
