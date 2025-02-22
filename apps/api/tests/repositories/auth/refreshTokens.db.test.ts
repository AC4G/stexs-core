import {
    describe,
    expect,
    it
} from '@jest/globals';
import db from '../../../src/db';
import {
    deleteRefreshToken,
    getActiveUserSessions,
    saveRefreshToken,
    signOutFromAllSessions,
    signOutFromSession
} from '../../../src/repositories/auth/refreshTokens';
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../../src/repositories/auth/users';

describe('Refresh Token Queries', () => {
    it('should handle validating oauth2 refresh token', async () => {
        await db.withRollbackTransaction(async (client) => {
            // validateOAuth2RefreshToken
        });
    });

    it('should handle revoking oauth2 refresh token', async () => {
        await db.withRollbackTransaction(async (client) => {
            // revokeOAuth2RefreshToken
        });
    });

    it('should handle deleting oauth2 connection', async () => {
        await db.withRollbackTransaction(async (client) => {
            // deleteOAuth2Connection
        });
    });

    it('should handle retrieving active user sessions', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();

            expect((await createUser(
                client,
                userId,
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

            expect((await getActiveUserSessions(userId, client)).rowCount).toBe(5);
        });
    });

    it('should handle saving refresh token for grant type password', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();

            expect((await createUser(
                client,
                userId,
            )).rowCount).toBe(1);

            expect((await saveRefreshToken(
                uuidv4(),
                userId,
                'password',
                uuidv4(),
                null,
                client
            )).rowCount).toBe(1);
        });
    });

    it('should handle sign out from one session', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';
            const password = 'save-password';
            const sessionId = uuidv4();

            expect((await createUser(
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

            expect((await createUser(
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

    it('should handle deleting refresh token', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const token = uuidv4();
            const sessionId = uuidv4();

            expect((await createUser(
                client,
                userId
            )).rowCount).toBe(1);

            expect((await saveRefreshToken(
                token,
                userId,
                'password',
                sessionId,
                null,
                client
            )).rowCount).toBe(1); 

            expect((await deleteRefreshToken(
                userId,
                token,
                sessionId,
                client
            )).rowCount).toBe(1);

            expect((await client.query(
                `
                    SELECT 1
                    FROM auth.refresh_tokens
                    WHERE user_id = $1::uuid
                        AND grant_type = 'password'
                        AND token = $2::uuid
                        AND session_id = $3::uuid;
                `,
                [
                    userId,
                    token,
                    sessionId
                ]
            )).rowCount).toBe(0);
        });
    });
})
