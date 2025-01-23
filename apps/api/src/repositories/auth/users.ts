import { PoolClient } from 'pg';
import { getQuery, type QueryResult } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export interface EmailVerificationState {
    email_verified_at: Date | null;
    verification_sent_at: Date | null;
}

export async function createTestUser(
    client: PoolClient,
    userId: string = uuidv4(),
    email: string = 'test@example.com',
    raw_user_meta_data: Record<string, any> = { username: 'testuser' },
    encrypted_password: string = 'save-password',
    email_verified_at: Date | null = null,
    verification_sent_at: Date | null = null,
    verification_token: string | null = null
): Promise<QueryResult> {
    return await client.query(
        {
            text: `
                INSERT INTO auth.users (
                    id,
                    email,
                    raw_user_meta_data,
                    encrypted_password,
                    email_verified_at,
                    verification_sent_at,
                    verification_token
                ) VALUES (
                    $1::uuid,
                    $2::text,
                    $3::jsonb,
                    $4::text,
                    $5::timestamptz,
                    $6::timestamptz,
                    $7::uuid
                );
            `,
            name: 'auth-create-test-user'
        },
        [
            userId,
            email,
            raw_user_meta_data,
            encrypted_password,
            email_verified_at,
            verification_sent_at,
            verification_token
        ],
    );
}

export async function getEmailVerificationState(
    email: string,
    token: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<EmailVerificationState>> {
    const query = getQuery(client);

    return await query<EmailVerificationState>(
        {
            text: `
                SELECT
                    email_verified_at,
                    verification_sent_at
                FROM auth.users
                WHERE email = $1::text
                    AND verification_token = $2::uuid;
            `,
            name: 'auth-get-email-verification-state'
        },
        [email, token],
    );
}

export interface EmailVerifiedStatus {
    email_verified_at: Date | null;
}

export async function getEmailVerifiedStatus(
    email: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<EmailVerifiedStatus>> {
    const query = getQuery(client);

    return await query<EmailVerifiedStatus>(
        {
            text: `
                SELECT
                    email_verified_at
                FROM auth.users
                WHERE email = $1::text;
            `,
            name: 'auth-get-email-verified-status'
        },
        [email],
    );
}

export async function verifyEmail(
    email: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.users
                SET 
                    verification_token = NULL,
                    verification_sent_at = NULL,
                    email_verified_at = CURRENT_TIMESTAMP
                WHERE email = $1::text;
            `,
            name: 'auth-verify-email'
        },
        [email],
    );
}

export async function updateEmailVerificationToken(
    email: string,
    token: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.users
                SET 
                    verification_token = $1::uuid,
                    verification_sent_at = CURRENT_TIMESTAMP
                WHERE email = $2::text;
            `,
            name: 'auth-update-email-verification-token'
        },
        [token, email],
    );
}

export async function signUpUser(
    email: string,
    password: string,
    username: string,
    token: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                INSERT INTO auth.users (
                    email, 
                    encrypted_password, 
                    raw_user_meta_data,
                    verification_token,
                    verification_sent_at
                ) 
                VALUES (
                    $1::text, 
                    $2::text, 
                    $3::jsonb, 
                    $4::uuid,
                    CURRENT_TIMESTAMP
                );
            `,
            name: 'auth-sign-up-user'
        },
        [
            email,
            password,
            { username },
            token
        ],
    );
}

export interface SignInUser {
    id: string;
    email_verified_at: Date | null;
    types: string[];
    banned_at: Date | null;
}

export async function signInUser(
    identifier: string,
    password: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<SignInUser>> {
    const query = getQuery(client);

    return await query<SignInUser>(
        {
            text: `
                SELECT 
                    u.id, 
                    u.email_verified_at,
                    ARRAY_REMOVE(ARRAY[
                        CASE WHEN mfa.email = TRUE THEN 'email' END,
                        CASE WHEN mfa.totp_verified_at IS NOT NULL THEN 'totp' END
                    ], NULL) AS types,
                    u.banned_at
                FROM auth.users AS u
                LEFT JOIN public.profiles AS p ON u.id = p.user_id
                LEFT JOIN auth.mfa ON u.id = mfa.user_id
                WHERE u.encrypted_password = extensions.crypt($2::text, u.encrypted_password)
                    AND (
                        (CASE WHEN $1::text ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN u.email ELSE p.username END) ILIKE $1::text
                    );
            `,
            name: 'auth-sign-in-user'
        },
        [identifier, password],
    );
}
