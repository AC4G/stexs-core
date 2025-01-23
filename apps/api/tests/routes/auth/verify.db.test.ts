import { expect, describe, it } from '@jest/globals';
import db from '../../../src/db';
import { v4 as uuidv4 } from 'uuid';
import {
    getEmailVerificationState,
    getEmailVerifiedStatus,
    updateEmailVerificationToken,
    verifyEmail,
    createTestUser
} from '../../../src/repositories/auth/users';

describe('Email Verification Queries', () => {
    it('should handle querying email verification state', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const token = uuidv4();
            const email_verified_at = new Date();
            const verification_sent_at = new Date();

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
                { username: 'testuser' },
                'save-password',
                email_verified_at,
                verification_sent_at,
                token
            )).rowCount).toBe(1);
    
            const { rowCount, rows } = await getEmailVerificationState(email, token, client);
    
            expect(rowCount).toBe(1);
            expect(rows[0].email_verified_at).toEqual(email_verified_at);
            expect(rows[0].verification_sent_at).toEqual(verification_sent_at);
        });
    });

    it('should handle update email verification status to verified', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
                { username: 'testuser' },
                'save-password',
                null,
                new Date(),
                uuidv4()
            )).rowCount).toBe(1);

            expect((await verifyEmail(email, client)).rowCount).toBe(1);

            const { rowCount, rows } = await client.query<{
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

            expect(rowCount).toBe(1);
            expect(rows[0].email_verified_at).not.toBeNull();
            expect(rows[0].verification_sent_at).toBeNull();
            expect(rows[0].verification_token).toBeNull();
        });
    });

    it('should handle querying email verification status', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email_verified_at = new Date();

            expect((await createTestUser(
                client,
                uuidv4(),
                'test@example.com',
                { username: 'testuser' },
                'save-password',
                email_verified_at,
                new Date(),
                uuidv4(),
            )).rowCount).toBe(1);
    
            const { rowCount, rows } = await getEmailVerifiedStatus('test@example.com', client);

            expect(rowCount).toBe(1);
            expect(rows[0].email_verified_at).toEqual(email_verified_at);
        });
    });

    it('should handle updating the email verification token', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const token = uuidv4();

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
                { username: 'testuser' },
                'save-password',
                null,
                new Date(),
                uuidv4()
            )).rowCount).toBe(1);

            expect((await updateEmailVerificationToken(email, token, client)).rowCount).toBe(1);

            const { rowCount, rows } = await client.query<{
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

            expect(rowCount).toBe(1);
            expect(rows[0].verification_sent_at).not.toBeNull();
            expect(rows[0].verification_token).toEqual(token);
        });
    });
});
