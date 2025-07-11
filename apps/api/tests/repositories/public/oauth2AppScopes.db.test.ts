import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';
import { addScopesToApp, checkClientScopes } from '../../../src/repositories/public/oauth2AppScopes';

describe('OAuth2 App Scopes Queries', () => {
    it('should handle adding scopes to an oauth2 app', async () => {
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

            const appId = rows2[0].id;

            expect(rowCount2).toBe(1);

            let scopeIds: number[] = [];

            for (let i = 0; i < 10; i++) {
                scopeIds.push(i + 1);
            }

            expect((await addScopesToApp(appId, scopeIds, client)).rowCount).toBe(10);
        });
    });

    it('should handle checking client scopes', async () => {
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

            const appId = rows2[0].id;
            const clientId = rows2[0].client_id;

            expect(rowCount2).toBe(1);

            let scopeIds: number[] = [];

            for (let i = 0; i < 4; i++) {
                scopeIds.push(i + 1);
            }

            expect((await addScopesToApp(appId, scopeIds, client)).rowCount).toBe(4);

            const scopeNames = [
                'item.read',
                'item.update',
                'item.delete',
                'item.write'
            ];

            expect((await checkClientScopes(
                clientId,
                scopeNames,
                client
            )).rowCount).toBe(1);

            const scopeNames2 = [
                'project.members.update',
                'project.members.delete',
                'project.requests.read',
                'project.requests.update',
                'project.requests.delete',
                'project.requests.write'
            ];

            expect((await checkClientScopes(
                clientId,
                scopeNames2,
                client
            )).rowCount).toBe(0);

            const scopeNames3 = scopeNames.concat(scopeNames2);

            expect((await checkClientScopes(
                clientId,
                scopeNames3,
                client
            )).rowCount).toBe(0);
        });
    });
});
 