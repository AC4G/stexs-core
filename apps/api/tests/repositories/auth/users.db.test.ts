import {
    expect,
    describe,
    it
} from '@jest/globals';
import db from '../../../src/db';
import { v4 as uuidv4 } from 'uuid';
import {
    getEmailVerificationState,
    getEmailVerifiedStatus,
    updateEmailVerificationToken,
    verifyEmail,
    createTestUser,
    signUpUser,
    signInUser,
    setRecoveryToken,
    confirmRecovery,
    compareNewPasswordWithOldPassword,
    validateRecoveryToken
} from '../../../src/repositories/auth/users';

describe('User Queries', () => {
    it('should handle checking if user exists by email', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
            )).rowCount).toBe(1);

            expect((await getEmailVerifiedStatus(
                email,
                client
            )).rowCount).toBe(1);
        });
    });

    it('should handle setting new recovery token', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const token = uuidv4();

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
            )).rowCount).toBe(1);

            expect((await setRecoveryToken(
                email,
                token,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await client.query<{
                recovery_token: string | null;
                recovery_sent_at: Date | null;
            }>(
                `
                    SELECT 
                        recovery_token,
                        recovery_sent_at
                    FROM auth.users
                    WHERE email = $1::text
                `,
                [email]
            );

            expect(rowCount).toBe(1);
            expect(rows[0].recovery_token).toBe(token);
            expect(rows[0].recovery_sent_at).toBeInstanceOf(Date);
        });
    });

    it('should handle validate recovery token against email and return sent date', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const token = uuidv4();

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
            )).rowCount).toBe(1);

            expect((await setRecoveryToken(
                email,
                token,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await validateRecoveryToken(
                email,
                token,
                client
            );

            expect(rowCount).toBe(1);
            expect(rows[0].recovery_sent_at).toBeInstanceOf(Date);
        });
    });

    it('should handle checking if the new password equals the old one', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const password = 'save-password';
            const differentPassword = 'different-password';

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
                { username: 'testuser' },
                password
            )).rowCount).toBe(1);

            const { rowCount, rows } = await compareNewPasswordWithOldPassword(
                email,
                password,
                client
            );
            
            expect(rowCount).toBe(1);
            expect(rows[0].is_current_password).toBe(true);

            const { rowCount: rowCount2, rows: rows2 } = await compareNewPasswordWithOldPassword(
                email,
                differentPassword,
                client
            );

            expect(rowCount2).toBe(1);
            expect(rows2[0].is_current_password).toBe(false);
        });
    });

    it('should handle confirming recovery', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const token = uuidv4();
            const newPassword = 'new-password';

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
            )).rowCount).toBe(1);

            expect((await setRecoveryToken(
                email,
                token,
                client
            )).rowCount).toBe(1);

            expect((await confirmRecovery(
                email,
                newPassword,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await client.query<{
                recovery_token: string | null;
                recovery_sent_at: Date | null;
            }>(
                `
                    SELECT
                        recovery_token,
                        recovery_sent_at
                    FROM auth.users
                    WHERE email = $1::text
                `,
                [email]
            );
        
            expect(rowCount).toBe(1);
            expect(rows[0].recovery_token).toBe(null);
            expect(rows[0].recovery_sent_at).toBe(null);
        });
    });

    it('should handle sign in with email', async () => {
        await db.withRollbackTransaction(async (client) => {
            const id = uuidv4();
            const email = 'test@example.com';
            const password = 'save-password';

            expect((await createTestUser(
                client,
                id,
                email,
                { username: 'testuser' },
                password
            )).rowCount).toBe(1);

            const { rowCount, rows } = await signInUser(email, password, client);

            expect(rowCount).toBe(1);
            expect(rows[0].id).toBe(id);
            expect(rows[0].email_verified_at).toBeNull();
            expect(rows[0].types).toEqual(['email']);
            expect(rows[0].banned_at).toBeNull();
        });
    });

    it('should handle sing in with username', async () => {
        await db.withRollbackTransaction(async (client) => {
            const id = uuidv4();
            const email = 'test@example.com';
            const username = 'testuser';
            const password = 'save-password';

            expect((await createTestUser(
                client,
                id,
                email,
                { username },
                password
            )).rowCount).toBe(1);

            const { rowCount, rows } = await signInUser(username, password, client);

            expect(rowCount).toBe(1);
            expect(rows[0].id).toBe(id);
            expect(rows[0].email_verified_at).toBeNull();
            expect(rows[0].types).toEqual(['email']);
            expect(rows[0].banned_at).toBeNull();
        });
    });

    it('should handle sign in with invalid credentials', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const password = 'save-password';
            const wrongPassword = 'wrong-password';

            expect((await createTestUser(
                client,
                uuidv4(),
                email,
                { username: 'testuser' },
                password
            )).rowCount).toBe(1);

            const response = await signInUser(email, wrongPassword, client);            

            expect(response.rowCount).toBe(0);
        });
    });

    it('should handle inserting a new user', async () => {
        await db.withRollbackTransaction(async (client) => {            
            const email = 'test@example.com';
            const password = 'save-password'; 
            const username = 'testuser';
            const token = uuidv4();

            expect((await signUpUser(
                email,
                password,
                username,
                token,
                client
            )).rowCount).toBe(1);

            expect((await client.query(
                `
                    SELECT 1
                    FROM auth.users AS u
                    JOIN public.profiles AS p ON p.user_id = u.id
                    WHERE u.email = $1::text;
                `,
                [email]
            )).rowCount).toBe(1);
        });
    });

    it('should handle inserting a new user with existing email', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const password = 'save-password';
            const username = 'testuser';
            const differentUsername = 'differentuser';
            const token = uuidv4();

            expect((await signUpUser(
                email,
                password,
                username,
                token,
                client
            )).rowCount).toBe(1);

            try {
                await signUpUser(
                    email,
                    password,
                    differentUsername,
                    token,
                    client
                );
            } catch (e) {
                const err = e as { hint: string | null };

                expect(err.hint).toBe('Please choose a different email');
            }
        });
    });

    it('should handle inserting a new user with existing username', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const differentEmail = 'different@example.com';
            const password = 'save-password';
            const username = 'testuser';
            const token = uuidv4();

            expect((await signUpUser(
                email,
                password,
                username,
                token,
                client
            )).rowCount).toBe(1);

            try {
                await signUpUser(
                    differentEmail,
                    password,
                    username,
                    token,
                    client
                );

                console.error('should not be reached');
            } catch (e) {
                const err = e as { hint: string | null };

                expect(err.hint).toBe('Please choose a different username');
            }
        });
    });

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
