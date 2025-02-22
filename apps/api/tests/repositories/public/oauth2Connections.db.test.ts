import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../../src/repositories/auth/users';
import { connectionExistsByUserIdAndClientId, createOAuth2Connection } from '../../../src/repositories/public/oauth2Connections';

describe('OAuth2 Connections Queries', () => {
    it('should handle checking if connection exists', async () => {
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

            expect((await createOAuth2Connection(
                userId,
                clientId,
                scopeIds,
                client
            )).rowCount).toBe(1);

            expect((await connectionExistsByUserIdAndClientId(
                userId,
                clientId,
                client
            )).rowCount).toBe(1);

            const userId2 = uuidv4();
            
            expect((await createUser(
                client,
                userId2,
                'test2@example.com',
                { username: 'testuser2' }
            )).rowCount).toBe(1);

            expect((await connectionExistsByUserIdAndClientId(
                userId2,
                clientId,
                client
            )).rowCount).toBe(0);
        });
    });

    it('should handle creating an oauth2 connection', async () => {
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

            const row3 = rows3[0];

            const connectionId = row3.id;

            expect(rowCount3).toBe(1);
            expect(connectionId).toEqual(expect.any(Number));
            expect(row3.inserted_scopes_count).toBe(4);

            const { rowCount: rowCount4, rows: rows4 } = await client.query(
                `
                    SELECT
                        user_id,
                        client_id,
                        created_at,
                        updated_at
                    FROM oauth2_connections
                    WHERE id = $1::integer
                `,
                [connectionId]
            );

            const row4 = rows4[0];

            expect(rowCount4).toBe(1);
            expect(row4.user_id).toBe(userId);
            expect(row4.client_id).toBe(clientId);
            expect(row4.created_at).toBeInstanceOf(Date);
            expect(row4.updated_at).toBeNull();

            const { rowCount: rowCount5, rows: rows5 } = await client.query(
                `
                    SELECT
                        id,
                        connection_id,
                        scope_id
                    FROM oauth2_connection_scopes
                    WHERE connection_id = $1::integer
                `,
                [connectionId]
            );

            expect(rowCount5).toBe(4);
            expect(rows5[0].id).toEqual(expect.any(Number));

            for (const row5 of rows5) {
                expect(scopeIds.includes(row5.scope_id)).toBe(true);
                expect(row5.connection_id).toBe(connectionId);
            }

            const userId2 = uuidv4();

            expect((await createUser(
                client,
                userId2,
                'test2@example.com',
                { username: 'testuser2' }
            )).rowCount).toBe(1);

            const scopeIds2 = [
                1, 2, 3, 4, // client
                28, 29, 30, 31 // user
            ];

            const { rowCount: rowCount6, rows: rows6 } = await createOAuth2Connection(
                userId2,
                clientId,
                scopeIds2,
                client
            );

            const row6 = rows6[0];

            expect(rowCount6).toBe(1);
            expect(row6.id).toEqual(expect.any(Number));
            expect(row6.inserted_scopes_count).toBe(4);
        });
    });
});
