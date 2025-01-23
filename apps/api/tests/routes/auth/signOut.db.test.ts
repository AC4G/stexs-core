import { describe, expect, it } from "@jest/globals";
import db from "../../../src/db";
import { createTestUser } from "../../../src/repositories/auth/users";
import { v4 as uuidv4 } from 'uuid';
import {
    saveRefreshToken,
    signOutFromAllSessions,
    signOutFromSession
} from "../../../src/repositories/auth/refreshTokens";

describe('Sign Out Queries', () => {
    it('should handle sign out from one session', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';
            const password = 'save-password';
            const sessionId = uuidv4();

            expect((await createTestUser(
                client,
                userId,
                email,
                { username: 'testuser' },
                password
            )).rowCount).toBe(1);

            expect((await saveRefreshToken(
                uuidv4(),
                userId,
                'password',
                sessionId,
                null,
                client
            )).rowCount).toBe(1);

            expect((await signOutFromSession(userId, sessionId, client)).rowCount).toBe(1);
        });
    });

    it('should handle sign out from all sessions', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';
            const password = 'save-password';

            expect((await createTestUser(
                client,
                userId,
                email,
                { username: 'testuser' },
                password
            )).rowCount).toBe(1);

            for (let i = 0; i < 5; i++) {
                expect((await saveRefreshToken(
                    uuidv4(),
                    userId,
                    'password',
                    uuidv4(),
                    null,
                    client
                )).rowCount).toBe(1);
            }

            expect((await signOutFromAllSessions(userId, client)).rowCount).toBe(5);
        });
    });
});
