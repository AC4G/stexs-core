import {
    describe,
    expect,
    it
} from '@jest/globals';
import db from '../../../src/db';
import {
    deleteOAuth2Connection,
    deleteRefreshToken,
    getActiveUserSessions,
    revokeOAuth2RefreshToken,
    saveRefreshToken,
    signOutFromAllSessions,
    signOutFromSession,
    validateOAuth2RefreshToken
} from '../../../src/repositories/auth/refreshTokens';
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../../src/repositories/auth/users';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';
import { createOAuth2Connection } from '../../../src/repositories/public/oauth2Connections';

describe('Refresh Token Queries', () => {
    it('should handle validating oauth2 refresh token', async () => {
        await db.withRollbackTransaction(async (client) => {
            const { rowCount, rows } = await createOrganization(client, 'TestOrganization');
                                                                         
            const organizationId = rows[0].id;

            expect(rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await createOAuth2App(
                'Test OAuth2 App',
                organizationId,
                null,
                'https://example.com/callback',
                client
            );

            const clientId = rows2[0].client_id;

            expect(rowCount2).toBe(1);

            const userId = uuidv4();
            
            expect((await createUser(
                client,
                userId,
            )).rowCount).toBe(1);

            const scopeIds = [
                5, 6, 7, 8 // user
            ];

            const { rowCount: rowCount3, rows: rows3 } = await createOAuth2Connection(
                userId,
                clientId,
                scopeIds,
                client
            );

            const connectionId = rows3[0].id;

            expect(rowCount3).toBe(1);

            const jti = uuidv4();

            expect((await saveRefreshToken(
                jti,
                userId,
                'authorization_code',
                null,
                connectionId,
                client
            )).rowCount).toBe(1);

            expect((await validateOAuth2RefreshToken(
                jti,
                userId,
                client
            )).rowCount).toBe(1);
        });
    });

    it('should handle revoking oauth2 refresh token', async () => {
        await db.withRollbackTransaction(async (client) => {
            const { rowCount, rows } = await createOrganization(client, 'TestOrganization');
                                                                         
            const organizationId = rows[0].id;

            expect(rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await createOAuth2App(
                'Test OAuth2 App',
                organizationId,
                null,
                'https://example.com/callback',
                client
            );

            const clientId = rows2[0].client_id;

            expect(rowCount2).toBe(1);

            const userId = uuidv4();
            
            expect((await createUser(
                client,
                userId,
            )).rowCount).toBe(1);

            const scopeIds = [
                5, 6, 7, 8 // user
            ];

            const { rowCount: rowCount3, rows: rows3 } = await createOAuth2Connection(
                userId,
                clientId,
                scopeIds,
                client
            );

            const connectionId = rows3[0].id;

            expect(rowCount3).toBe(1);

            const jti = uuidv4();

            expect((await saveRefreshToken(
                jti,
                userId,
                'authorization_code',
                null,
                connectionId,
                client
            )).rowCount).toBe(1);

            expect((await revokeOAuth2RefreshToken(
                userId,
                jti,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount4 } = await client.query(
                `
                    SELECT 1
                    FROM auth.refresh_tokens
                    WHERE token = $1::uuid
                        AND user_id = $2::uuid
                        AND grant_type = 'authorization_code'
                        AND session_id IS NULL;
                `,
                [jti, userId]
            );

            expect(rowCount4).toBe(0);
        });
    });

    it('should handle deleting oauth2 connection', async () => {
        await db.withRollbackTransaction(async (client) => {
            const { rowCount, rows } = await createOrganization(client, 'TestOrganization');
                                                                         
            const organizationId = rows[0].id;

            expect(rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await createOAuth2App(
                'Test OAuth2 App',
                organizationId,
                null,
                'https://example.com/callback',
                client
            );

            const clientId = rows2[0].client_id;

            expect(rowCount2).toBe(1);

            const userId = uuidv4();
            
            expect((await createUser(
                client,
                userId,
            )).rowCount).toBe(1);

            const scopeIds = [
                5, 6, 7, 8 // user
            ];

            const { rowCount: rowCount3, rows: rows3 } = await createOAuth2Connection(
                userId,
                clientId,
                scopeIds,
                client
            );

            const connectionId = rows3[0].id;

            expect(rowCount3).toBe(1);

            const jti = uuidv4();

            expect((await saveRefreshToken(
                jti,
                userId,
                'authorization_code',
                null,
                connectionId,
                client
            )).rowCount).toBe(1);

            expect((await deleteOAuth2Connection(
                connectionId,
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount4 } = await client.query(
                `
                    SELECT 1
                    FROM public.oauth2_connections
                    WHERE id = $1::int;
                `,
                [connectionId]
            );

            expect(rowCount4).toBe(0);
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
            const sessionId = uuidv4();

            expect((await createUser(
                client,
                userId,
                email,
                { username: 'testuser' },
                null
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

            expect((await createUser(
                client,
                userId,
                email,
                { username: 'testuser' },
                null
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
