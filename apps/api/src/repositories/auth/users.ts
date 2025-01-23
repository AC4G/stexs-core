import { PoolClient } from 'pg';
import { getQuery, type QueryResult } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export interface EmailVerificationState {
    email_verified_at: Date | null;
    verification_sent_at: Date | null;
}

export async function createTestUser(
    client: PoolClient,
    id: string = uuidv4(),
    email: string = 'test@example.com',
    raw_user_meta_data: Record<string, any> = { username: 'testuser' },
    encrypted_password: string = 'encrypted-password',
    email_verified_at: Date | null = null,
    verification_sent_at: Date | null = null,
    verification_token: string | null = null
): Promise<QueryResult> {
    return await client.query(
        `
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
        [
            id,
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

    const { rowCount, rows } = await query<EmailVerificationState>(
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

    return {
        rowCount,
        rows,
    };
}

export interface EmailVerifiedStatus {
    email_verified_at: Date | null;
}

export async function getEmailVerifiedStatus(
    email: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<EmailVerifiedStatus>> {
    const query = getQuery(client);

    const { rowCount, rows } = await query<EmailVerifiedStatus>(
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

    return {
        rowCount,
        rows,
    };
}

export async function verifyEmail(
    email: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    const { rowCount, rows } = await query(
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

    return {
        rowCount,
        rows,
    };
}

export async function updateEmailVerificationToken(
    email: string,
    token: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    const { rowCount, rows } = await query(
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

    return {
        rowCount,
        rows
    };
}

export async function signUpUser(
    email: string,
    password: string,
    username: string,
    token: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    const { rowCount, rows } = await query(
        `
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
        [
            email,
            password,
            { username },
            token
        ],
    );

    return {
        rowCount,
        rows
    };
}
