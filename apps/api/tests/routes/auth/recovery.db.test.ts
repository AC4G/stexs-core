import { describe, expect, it } from "@jest/globals";
import db from "../../../src/db";
import { v4 as uuidv4 } from "uuid";
import {
    compareNewPasswordWithOldPassword,
    confirmRecovery,
    createTestUser,
    getEmailVerifiedStatus,
    setRecoveryToken,
    validateRecoveryToken
} from "../../../src/repositories/auth/users";

describe('Recovery Queries', () => {
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
});
