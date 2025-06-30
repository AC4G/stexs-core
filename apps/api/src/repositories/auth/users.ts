import type { PoolClient, QueryResult } from 'pg';
import { getQuery } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../services/password';

export async function createUser(
    client: PoolClient,
    userId: string = uuidv4(),
    email: string = 'test@example.com',
    rawUserMetaData: Record<string, any> = { username: 'username' },
    encryptedPassword: string | null = null,
    emailVerifiedAt: Date | null = null,
    verificationSentAt: Date | null = null,
    verificationToken: string | null = null
): Promise<QueryResult> {
    if (!encryptedPassword) {
        encryptedPassword = await hashPassword('save-password');
    }

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
            name: 'auth-create-user'
        },
        [
            userId,
            email,
            rawUserMetaData,
            encryptedPassword,
            emailVerifiedAt,
            verificationSentAt,
            verificationToken
        ],
    );
}

export async function getEmailVerificationState(
    email: string,
    token: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    email_verified_at: Date | null;
    verification_sent_at: Date | null;
}>> {
    const query = getQuery(client);

    return await query(
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

export async function getEmailVerifiedStatus(
    email: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    email_verified_at: Date | null;
}>> {
    const query = getQuery(client);                                                                                                                                                                                 

    return await query(
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
    encryptedPassword: string,
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
            encryptedPassword,
            { username },
            token
        ],
    );
}

export async function getUserAuth(
    identifier: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    id: string;
    email_verified_at: Date | null;
    encrypted_password: string;
    types: string[];
    banned_at: Date | null;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 
                    u.id, 
                    u.email_verified_at,
                    u.encrypted_password,
                    ARRAY_REMOVE(ARRAY[
                        CASE WHEN mfa.email = TRUE THEN 'email' END,
                        CASE WHEN mfa.totp_verified_at IS NOT NULL THEN 'totp' END
                    ], NULL) AS types,
                    u.banned_at
                FROM auth.users AS u
                LEFT JOIN public.profiles AS p ON u.id = p.user_id
                LEFT JOIN auth.mfa ON u.id = mfa.user_id
                WHERE u.email = $1::citext OR p.username = $1::citext;
            `,
            name: 'auth-user-auth'
        },
        [identifier],
    );
}

export async function userExistsByEmail(
    email: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT 1
                FROM auth.users
                WHERE email = $1::text;
            `,
            name: 'auth-user-exists-by-email'
        },
        [email],
    );
}

export async function setRecoveryToken(
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
                    recovery_token = $1::uuid,
                    recovery_sent_at = CURRENT_TIMESTAMP
                WHERE email = $2::text;
            `,
            name: 'auth-set-recovery-token'
        },
        [token, email],
    );
}

export async function validateRecoveryToken(
    email: string,
    token: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    recovery_sent_at: Date | null;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT recovery_sent_at
                FROM auth.users
                WHERE email = $1::text
                    AND recovery_token = $2::uuid;
            `,
            name: 'auth-validate-recovery-token'
        },
        [email, token],
    );
}

export async function getUsersEncryptedPassword(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    encrypted_password: string;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT
                    encrypted_password
                FROM auth.users
                WHERE id = $1::uuid;
            `,
            name: 'auth-get-users-encrypted-password'
        },
        [userId],
    );
}

export async function confirmRecovery(
    email: string,
    encryptedPassword: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.users
                SET 
                    recovery_token = NULL,
                    recovery_sent_at = NULL,
                    encrypted_password = $2::text
                WHERE email = $1::text;
            `,
            name: 'auth-confirm-recovery'
        },
        [email, encryptedPassword],
    );
}

export async function changePassword(
    userId: string,
    encryptedPassword: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.users
                SET
                    encrypted_password = $2::text
                WHERE id = $1::uuid;
            `,
            name: 'auth-change-password'
        },
        [userId, encryptedPassword],
    );
}

export async function getUserData(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    id: string;
    email: string;
    username: string;
    raw_user_meta_data: Record<string, any>;
    created_at: Date;
    updated_at: Date | null;
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT
                    u.id,
                    u.email,
                    p.username,
                    u.raw_user_meta_data,
                    u.created_at,
                    u.updated_at
                FROM auth.users AS u
                JOIN public.profiles AS p ON u.id = p.user_id
                WHERE id = $1::uuid;
            `,
            name: 'auth-get-user-data'
        },
        [userId],
    );
}

export async function initalizeEmailChange(
    userId: string,
    newEmail: string,
    confirmationCode: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.users
                SET
                    email_change = $1::text,
                    email_change_sent_at = CURRENT_TIMESTAMP,
                    email_change_code = $2::text
                WHERE id = $3::uuid;
            `,
            name: 'auth-initialize-email-change'
        },
        [
            newEmail,
            confirmationCode,
            userId
        ],
    );
}

export async function validateEmailChange(
    userId: string,
    confirmationCode: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult<{
    email_change_sent_at: Date | null
}>> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                SELECT email_change_sent_at 
                FROM auth.users
                WHERE id = $1::uuid 
                    AND email_change_code = $2::text
            `,
            name: 'auth-validate-email-change'
        },
        [userId, confirmationCode],
    );
}

export async function finalizeEmailChange(
    userId: string,
    client: PoolClient | undefined = undefined
): Promise<QueryResult> {
    const query = getQuery(client);

    return await query(
        {
            text: `
                UPDATE auth.users
                SET
                    email = email_change,
                    email_verified_at = CURRENT_TIMESTAMP,
                    email_change = NULL,
                    email_change_sent_at = NULL,
                    email_change_code = NULL
                WHERE id = $1::uuid;
            `,
            name: 'auth-finalize-email-change'
        },
        [userId],
    );
}
