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
import { generateCode } from 'utils-node';
import { compare } from 'bcrypt';

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

    it('should handle retrieving user data', async () => {
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

    it('should handle sing up a new user', async () => {
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

            const { rowCount, rows } = await client.query<{
                id: string;
                email: string;
                encrypted_password: string;
                email_verified_at: Date | null;
                verification_token: string | null;
                verification_sent_at: Date | null;
                raw_user_meta_data: Record<string, unknown>;
                is_super_admin: boolean;
                email_change: string | null;
                email_change_sent_at: Date | null;
                email_change_code: string | null;
                recovery_token: string | null;
                recovery_sent_at: Date | null;
                banned_at: Date | null;
                created_at: Date;
                updated_at: Date | null;
            }>(
                `
                    SELECT
                        id,
                        email,
                        encrypted_password,
                        email_verified_at,
                        verification_token,
                        verification_sent_at,
                        raw_user_meta_data,
                        is_super_admin,
                        email_change,
                        email_change_sent_at,
                        email_change_code,
                        recovery_token,
                        recovery_sent_at,
                        banned_at,
                        created_at,
                        updated_at
                    FROM auth.users
                    WHERE email = $1::text;
                `,
                [email]
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(email);

            const passwordMatch = await compare(password, row.encrypted_password);
            
            expect(passwordMatch).toBe(true);

            expect(row.email_verified_at).toBe(null);
            expect(row.verification_token).toBe(token);
            expect(row.verification_sent_at).toBeInstanceOf(Date);
            expect(row.raw_user_meta_data).toEqual({});
            expect(row.is_super_admin).toBe(false);
            expect(row.email_change).toBe(null);
            expect(row.email_change_sent_at).toBe(null);
            expect(row.email_change_code).toBe(null);
            expect(row.recovery_token).toBe(null);
            expect(row.recovery_sent_at).toBe(null);
            expect(row.banned_at).toBe(null);
            expect(row.created_at).toBeInstanceOf(Date);
            expect(row.updated_at).toBe(null);

            const {  rowCount: rowCount2, rows: rows2 } = await client.query<{
                user_id: string;
                email: boolean;
                totp_secret: string | null;
                totp_verified_at: Date | null;
                email_code: string | null;
                email_code_sent_at: Date | null;
            }>(
                `
                    SELECT
                        user_id,
                        email,
                        totp_secret,
                        totp_verified_at,
                        email_code,
                        email_code_sent_at
                    FROM auth.mfa
                    WHERE user_id = $1::uuid
                `,
                [row.id]
            );

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.user_id).toBe(row.id);
            expect(row2.email).toBe(true);
            expect(row2.totp_secret).toBe(null);
            expect(row2.totp_verified_at).toBe(null);
            expect(row2.email_code).toBe(null);
            expect(row2.email_code_sent_at).toBe(null);

            const { rowCount: rowCount3, rows: rows3 } = await client.query<{
                user_id: string;
                username: string;
                bio: string | null;
                url: string | null;
                is_private: boolean;
                accept_friend_requests: boolean;
                created_at: Date;
            }>(
                `
                    SELECT
                        user_id,
                        username,
                        bio,
                        url,
                        is_private,
                        accept_friend_requests,
                        created_at
                    FROM public.profiles
                    WHERE user_id = $1::uuid
                `,
                [row.id]
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.user_id).toBe(row.id);
            expect(row3.username).toBe(username);
            expect(row3.bio).toBe(null);
            expect(row3.url).toBe(null);
            expect(row3.is_private).toBe(false);
            expect(row3.accept_friend_requests).toBe(true);
            expect(row3.created_at).toBeInstanceOf(Date);
        });
    });

    it('should handle signing upa new user with existing email', async () => {
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

    it('should handle signing up a new user with existing username', async () => {
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

    it('should handle creating a test user', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';
            const username = 'testuser';

            expect((await createTestUser(
                client,
                userId,
                email,
                { username: username },
            )).rowCount).toBe(1);
    
            const { rowCount, rows } = await client.query<{
                id: string;
                email: string;
                raw_user_meta_data: Record<string, any>;
                encrypted_password: string;
                email_verified_at: Date | null;
                verification_token: string | null;
                verification_sent_at: Date | null;
                is_super_admin: boolean;
                email_change: string | null;
                email_change_sent_at: Date | null;
                email_change_code: string | null;
                recovery_token: string | null;
                recovery_sent_at: Date | null;
            }>(
                `
                    SELECT
                        id,
                        email,
                        raw_user_meta_data,
                        encrypted_password,
                        email_verified_at,
                        verification_token,
                        verification_sent_at,
                        is_super_admin,
                        email_change,
                        email_change_sent_at,
                        email_change_code,
                        recovery_token,
                        recovery_sent_at
                    FROM auth.users
                    WHERE id = $1::uuid;
                `,
                [userId]
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.id).toBe(userId);
            expect(row.email).toBe(email);
            expect(row.raw_user_meta_data).toEqual({});
            expect(row.email_verified_at).toBeNull();
            expect(row.verification_token).toBeNull();
            expect(row.verification_sent_at).toBeNull();
            expect(row.is_super_admin).toBe(false);
            expect(row.email_change).toBeNull();
            expect(row.email_change_sent_at).toBeNull();
            expect(row.email_change_code).toBeNull();
            expect(row.recovery_token).toBeNull();
            expect(row.recovery_sent_at).toBeNull;

            const {  rowCount: rowCount2, rows: rows2 } = await client.query<{
                user_id: string;
                email: boolean;
                totp_secret: string | null;
                totp_verified_at: Date | null;
                email_code: string | null;
                email_code_sent_at: Date | null;
            }>(
                `
                    SELECT
                        user_id,
                        email,
                        totp_secret,
                        totp_verified_at,
                        email_code,
                        email_code_sent_at
                    FROM auth.mfa
                    WHERE user_id = $1::uuid
                `,
                [userId]
            );

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.user_id).toBe(userId);
            expect(row2.email).toBe(true);
            expect(row2.totp_secret).toBeNull();
            expect(row2.totp_verified_at).toBeNull();
            expect(row2.email_code).toBeNull();
            expect(row2.email_code_sent_at).toBeNull();

            const { rowCount: rowCount3, rows: rows3 } = await client.query<{
                user_id: string;
                username: string;
                bio: string | null;
                url: string | null;
                is_private: boolean;
                accept_friend_requests: boolean;
                created_at: Date;
            }>(
                `
                    SELECT
                        user_id,
                        username,
                        bio,
                        url,
                        is_private,
                        accept_friend_requests,
                        created_at
                    FROM public.profiles
                    WHERE user_id = $1::uuid;
                `,
                [userId]
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.user_id).toBe(userId);
            expect(row3.username).toBe(username);
            expect(row3.bio).toBeNull();
            expect(row3.url).toBeNull();
            expect(row3.is_private).toBe(false);
            expect(row3.accept_friend_requests).toBe(true);
            expect(row3.created_at).not.toBeNull();
        });
    });
});
