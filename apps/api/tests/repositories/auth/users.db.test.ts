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
    compareNewPasswordWithOldPasswordByEmail,
    validateRecoveryToken,
    getUserData,
    compareNewPasswordWithOldPasswordByUserId,
    changePassword,
    initalizeEmailChange,
    validateEmailChange,
    finalizeEmailChange
} from '../../../src/repositories/auth/users';
import logger from '../../../src/loggers/logger'
import { generateCode } from 'utils-node';

describe('User Queries', () => {
    it('should handle initializing email change', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const newEmail = 'newemail@example.com';
            const emailChangeCode = generateCode(8);

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            expect((await initalizeEmailChange(
                userId,
                newEmail,
                emailChangeCode,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await client.query(
                `
                    SELECT
                        email_change,
                        email_change_sent_at,
                        email_change_code
                    FROM auth.users
                    WHERE id = $1::uuid;
                `,
                [userId]
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email_change).toBe(newEmail);
            expect(row.email_change_sent_at).toBeInstanceOf(Date);
            expect(row.email_change_code).toBe(emailChangeCode);
        });
    });

    it('should handle validating email change', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const newEmail = 'newemail@example.com';
            const emailChangeCode = generateCode(8);
            const wrongEmailChangeCode = generateCode(8);

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            expect((await initalizeEmailChange(
                userId,
                newEmail,
                emailChangeCode,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await validateEmailChange(
                userId,
                emailChangeCode,
                client
            );

            expect(rowCount).toBe(1);
            expect(rows[0].email_change_sent_at).toBeInstanceOf(Date);

            const { rowCount: rowCount2 } = await validateEmailChange(
                userId,
                wrongEmailChangeCode,
                client
            );

            expect(rowCount2).toBe(0);
        });
    });

    it('should handle finalizing email change', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const newEmail = 'newemail@example.com';
            const emailChangeCode = generateCode(8);

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            expect((await initalizeEmailChange(
                userId,
                newEmail,
                emailChangeCode,
                client
            )).rowCount).toBe(1);

            expect((await finalizeEmailChange(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await client.query<{
                email: string;
                email_verified_at: Date | null;
                email_change: string | null;
                email_change_sent_at: Date | null;
                email_change_code: string | null;
            }>(
                `
                    SELECT
                        email,
                        email_verified_at,
                        email_change,
                        email_change_sent_at,
                        email_change_code
                    FROM auth.users
                    WHERE id = $1::uuid;
                `,
                [userId]
            );

            const now = new Date().getTime();
            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(newEmail);
            expect(row.email_verified_at).toBeInstanceOf(Date);
            expect(row.email_verified_at?.getTime()).toBeGreaterThan(now - 100);
            expect(row.email_change).toBeNull();
            expect(row.email_change_sent_at).toBeNull();
            expect(row.email_change_code).toBeNull();
        });
    });

    it('should handle changing password', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';
            const password = 'save-password';
            const newPassword = 'new-password';

            expect((await createTestUser(
                client,
                userId,
                email,
                { username: 'testuser' },
                password
            )).rowCount).toBe(1);
            
            expect((await changePassword(
                userId,
                newPassword,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await compareNewPasswordWithOldPasswordByUserId(
                userId,
                newPassword,
                client
            );

            expect(rowCount).toBe(1);
            expect(rows[0].is_current_password).toBe(true);
        });
    });

    it('should handle checking if the new password equals the old one by user id', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';
            const password = 'save-password';
            const differentPassword = 'different-password';

            expect((await createTestUser(
                client,
                userId,
                email,
                { username: 'testuser' },
                password
            )).rowCount).toBe(1);

            const { rowCount, rows } = await compareNewPasswordWithOldPasswordByUserId(
                userId,
                password,
                client
            );

            logger.debug(`${rowCount}, ${rows}`);
            
            expect(rowCount).toBe(1);
            expect(rows[0].is_current_password).toBe(true);

            const { rowCount: rowCount2, rows: rows2 } = await compareNewPasswordWithOldPasswordByUserId(
                userId,
                differentPassword,
                client
            );

            expect(rowCount2).toBe(1);
            expect(rows2[0].is_current_password).toBe(false);
        });
    });

    it('should handle getting user data', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';
            const username = 'testuser';

            expect((await createTestUser(
                client,
                userId,
                email,
                { username },
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getUserData(userId, client);

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.id).toBe(userId);
            expect(row.username).toBe(username);
            expect(row.email).toBe(email);
            expect(row.raw_user_meta_data).toEqual({});
            expect(row.created_at).toBeInstanceOf(Date);
            expect(row.updated_at).toBeNull();
        });
    });

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

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.recovery_token).toBe(token);
            expect(row.recovery_sent_at).toBeInstanceOf(Date);
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

    it('should handle checking if the new password equals the old one by email', async () => {
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

            const { rowCount, rows } = await compareNewPasswordWithOldPasswordByEmail(
                email,
                password,
                client
            );
            
            expect(rowCount).toBe(1);
            expect(rows[0].is_current_password).toBe(true);

            const { rowCount: rowCount2, rows: rows2 } = await compareNewPasswordWithOldPasswordByEmail(
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

            const row = rows[0];
        
            expect(rowCount).toBe(1);
            expect(row.recovery_token).toBe(null);
            expect(row.recovery_sent_at).toBe(null);
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

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.id).toBe(id);
            expect(row.email_verified_at).toBeNull();
            expect(row.types).toEqual(['email']);
            expect(row.banned_at).toBeNull();
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

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.id).toBe(id);
            expect(row.email_verified_at).toBeNull();
            expect(row.types).toEqual(['email']);
            expect(row.banned_at).toBeNull();
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
    
            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email_verified_at).toEqual(email_verified_at);
            expect(row.verification_sent_at).toEqual(verification_sent_at);
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

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email_verified_at).not.toBeNull();
            expect(row.verification_sent_at).toBeNull();
            expect(row.verification_token).toBeNull();
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

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.verification_sent_at).not.toBeNull();
            expect(row.verification_token).toEqual(token);
        });
    });
});
