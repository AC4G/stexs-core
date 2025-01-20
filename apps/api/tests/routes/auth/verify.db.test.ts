import {
	expect,
	describe,
	it,
} from '@jest/globals';
import db from '../../../src/db';
import { v4 as uuidv4 } from 'uuid';
import {
    getEmailVerificationState,
    getEmailVerifiedStatus,
    updateEmailVerificationToken,
    verifyEmail
} from '../../../src/repositories/auth/users';
import { PoolClient } from 'pg';

async function createTestUser(
    client: PoolClient,
    email: string = 'test@example.com',
    raw_user_meta_data: Record<string, any> = {
        username: 'test-user',
    },
    encrypted_password: string = 'encrypted-password',
    email_verified_at: Date | null = null,
    verification_sent_at: Date | null = null,
    verification_token: string | null = null
) {
    await client.query(
        `
            INSERT INTO auth.users (
                email,
                raw_user_meta_data,
                encrypted_password,
                email_verified_at,
                verification_sent_at,
                verification_token
            ) VALUES (
                $1::text,
                $2::jsonb,
                $3::text,
                $4::timestamptz,
                $5::timestamptz,
                $6::uuid
            );
        `,
        [
            email,
            raw_user_meta_data,
            encrypted_password,
            email_verified_at,
            verification_sent_at,
            verification_token
        ],
    );
}

describe('Email Verification Queries', () => {
    it('should handle querying email verification state', async () => {
        const email = 'test@example.com';
        const token = uuidv4();
        const email_verified_at = new Date();
        const verification_sent_at = new Date();

        db.withRollbackTransaction(async (client) => {
            await createTestUser(
                client,
                email,
                { username: 'test-user' },
                'encrypted-password',
                email_verified_at,
                verification_sent_at,
                token
            );
    
            const { rowCount, rows } = await getEmailVerificationState(email, token, client);
    
            expect(rowCount).toBe(1);
            expect(rows[0].email_verified_at).toEqual(email_verified_at);
            expect(rows[0].verification_sent_at).toEqual(verification_sent_at);
        });
    });

    it('should handle update email verification status to verified', async () => {
        const email = 'test@example.com';

        db.withRollbackTransaction(async (client) => {
            await createTestUser(
                client,
                email,
                { username: 'test-user' },
                'encrypted-password',
                null,
                new Date(),
                uuidv4()
            );

            const { rowCount } = await verifyEmail(email, client);

            expect(rowCount).toBe(1);

            const { rows } = await client.query<{
                email_verified_at: Date | null;
                verification_sent_at: Date | null;
                verification_token: string | null;
            }>(
                `
                    SELECT 
                        email_verified_at,
                        verification_sent_at,
                        verification_token
                    FROM auth.users
                    WHERE email = $1::text
                `,
                [email]
            );

            expect(rows[0].email_verified_at).not.toBeNull();
            expect(rows[0].verification_sent_at).toBeNull();
            expect(rows[0].verification_token).toBeNull();
        });
    });

    it('should handle querying email verification status', async () => {
        const email_verified_at = new Date();

        db.withRollbackTransaction(async (client) => {
            await createTestUser(
                client,
                'test@example.com',
                { username: 'test-user' },
                'encrypted-password',
                email_verified_at,
                new Date(),
                uuidv4(),
            );
    
            const { rowCount, rows } = await getEmailVerifiedStatus('test@example.com', client);

            expect(rowCount).toBe(1);
            expect(rows[0].email_verified_at).toEqual(email_verified_at);
        });
    });

    it('should handle updating the email verification token', async () => {
        const email = 'test@example.com';
        const token = uuidv4();

        db.withRollbackTransaction(async (client) => {
            await createTestUser(
                client,
                email,
                { username: 'test-user' },
                'encrypted-password',
                null,
                new Date(),
                uuidv4()
            );

            const { rowCount } =  await updateEmailVerificationToken(email, token, client);

            expect(rowCount).toBe(1);

            const { rows } = await client.query<{
                verification_sent_at: Date | null;
                verification_token: Date | null;
            }>(
                `
                    SELECT
                        verification_sent_at,
                        verification_token
                    FROM auth.users
                    WHERE email = $1::text
                `,
                [email]
            );

            expect(rows[0].verification_sent_at).not.toBeNull();
            expect(rows[0].verification_token).toEqual(token);
        });
    });
});
