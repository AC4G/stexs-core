import { describe, expect, it } from "@jest/globals";
import db from "../../../src/db";
import { createTestUser, signInUser } from "../../../src/repositories/auth/users";
import { v4 as uuidv4 } from 'uuid';

describe('Sign In Queries', () => {
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
});
