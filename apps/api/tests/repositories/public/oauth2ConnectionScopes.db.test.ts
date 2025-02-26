import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../../src/repositories/auth/users';
import { createOAuth2Connection } from '../../../src/repositories/public/oauth2Connections';
import { updateConnectionScopes } from '../../../src/repositories/public/oauth2ConnectionScopes';

describe('OAuth2 Connection Scopes Queries', () => {
    it('should handle updating connection scopes', async () => {
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

            const scopeIds2 =  [
                // client
                'organization.requests.read',
                'organization.requests.update',
                'organization.requests.delete',
                'organization.requests.write',
                // user
                'friend.requests.write', // 28
                'friend.requests.read', // 29
                'friend.requests.delete', // 30
                'friend.read' // 31
            ];

            scopeIds.push(...[
                28, 29, 30, 31
            ]);

            expect((await updateConnectionScopes(
                userId,
                clientId,
                scopeIds2,
                client
            )).rowCount).toBe(4);

            const { rowCount: rowCount4, rows: rows4 } = await client.query(
                `
                    SELECT
                        ocs.id,
                        ocs.scope_id,
                        s.type
                    FROM public.oauth2_connection_scopes AS ocs
                    JOIN public.scopes AS s ON ocs.scope_id = s.id
                    WHERE connection_id = $1::integer
                `,
                [connectionId]
            );

            expect(rowCount4).toBe(scopeIds.length);

            for (const row of rows4) {
                expect(scopeIds.includes(row.scope_id)).toBe(true);
            }
        });
    });
});
