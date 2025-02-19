import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { validate } from 'uuid';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createProject } from '../../../src/repositories/public/projects';
import {
    createOAuth2App,
    getRedirectUrlAndScopesByClientId,
    validateClientCredentials
} from '../../../src/repositories/public/oauth2Apps';
import { addScopesToApp } from '../../../src/repositories/public/oauth2AppScopes';

describe('OAuth2 Apps Queries', () => {
    it('should handle validating client credentials', async () => {
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

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);

            const appId = row2.id;
            const clientId = row2.client_id;
            const clientSecret = row2.client_secret;

            const scopeIds = [
                1, 2, 3, 4, // client
                5, 6, 7, 8 // user
            ];

            expect((await addScopesToApp(
                appId,
                scopeIds,
                client
            )).rowCount).toBe(scopeIds.length);

            const { rowCount: rowCount3, rows: rows3 } = await validateClientCredentials(
                clientId,
                clientSecret,
                client
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.organization_id).toBe(organizationId);
            expect(row3.scope_ids?.length).toBe(4);

            const { rowCount: rowCount4 } = await client.query(
                `
                    SELECT 1
                    FROM public.scopes
                    WHERE id = ANY($1::int[])
                        AND type = 'client'
                    GROUP BY 1
                    HAVING COUNT(*) = array_length($1::int[], 1);
                `,
                [row3.scope_ids]
            );

            expect(rowCount4).toBe(1);            
        });
    });

    it('should handle retrieving redirect url and scopes by client id with valid user type scopes', async () => {
        await db.withRollbackTransaction(async (client) => {
            const { rowCount, rows } = await createOrganization(client, 'TestOrganization');
                         
            const organizationId = rows[0].id;

            expect(rowCount).toBe(1);

            const redirectUrl = 'https://example.com/callback';

            const { rowCount: rowCount3, rows: rows3 } = await createOAuth2App(
                'Test OAuth2 App',
                organizationId,
                null,
                redirectUrl,
                client
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);

            const appId = row3.id;
            const clientId = row3.client_id;

            // only user type scopes

            const scopeIds = [5, 6, 7, 8];

            expect((await addScopesToApp(
                appId,
                scopeIds,
                client
            )).rowCount).toBe(scopeIds.length);

            const { rowCount: rowCount4, rows: rows4 } = await getRedirectUrlAndScopesByClientId(
                clientId,
                client
            );

            const row4 = rows4[0];

            expect(rowCount4).toBe(1);
            expect(row4.redirect_url).toBe(redirectUrl);
            expect(row4.scopes.length).toEqual(scopeIds.length);

            // only client type scopes

            const scopeIds2 = [1, 2, 3, 4];

            expect((await addScopesToApp(
                appId,
                scopeIds2,
                client
            )).rowCount).toBe(scopeIds2.length);

            const { rowCount: rowCount5, rows: rows5 } = await getRedirectUrlAndScopesByClientId(
                clientId,
                client
            );

            // should return the user typed scopes only

            const row5 = rows5[0];

            expect(rowCount5).toBe(1);
            expect(row5.redirect_url).toBe(redirectUrl);
            expect(row5.scopes.length).toEqual(4);

            for (const scope of row4.scopes) {
                expect(row5.scopes.includes(scope)).toBe(true);  
            }

            // should return the total number of scopes by scopeIds and scopeIds2 combined

            const {  rowCount: rowCount6, rows: rows6 } = await client.query(
                `
                    SELECT 1
                    FROM public.oauth2_app_scopes
                    JOIN public.scopes AS s ON oauth2_app_scopes.scope_id = s.id
                    WHERE app_id = $1::integer;
                `,
                [appId]
            );

            expect(rowCount6).toBe(scopeIds.length + scopeIds2.length);
        });
    });

    it('should handle creating a oauth2 app', async () => {
        await db.withRollbackTransaction(async (client) => {
            const { rowCount, rows } = await createOrganization(client, 'TestOrganization');
                         
            const organizationId = rows[0].id;

            expect(rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await createProject(
                client,
                organizationId,
                'TestProject'
            );

            const projectId = rows2[0].id;

            expect(rowCount2).toBe(1);

            const appName = 'Test OAuth2 App';
            const redirectUrl = 'https://example.com/callback';

            const { rowCount: rowCount3, rows: rows3 } = await createOAuth2App(
                appName,
                organizationId,
                projectId,
                redirectUrl,
                client
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.id).toEqual(expect.any(Number));
            expect(validate(row3.client_id)).toBe(true);
            expect(row3.client_secret).toMatch(/^[a-f0-9]{64}$/);

            const { rowCount: rowCount4, rows: rows4 } = await client.query<{
                name: string,
                organization_id: number,
                project_id: number,
                redirect_url: string,
                created_at: Date,
                updated_at: Date | null
            }>(
                `
                    SELECT
                        name,
                        organization_id,
                        project_id,
                        redirect_url,
                        created_at,
                        updated_at
                    FROM public.oauth2_apps
                    WHERE id = $1::integer;
                `,
                [row3.id]
            );

            const row4 = rows4[0];

            expect(rowCount4).toBe(1);
            expect(row4.name).toBe(appName);
            expect(row4.organization_id).toBe(organizationId);
            expect(row4.project_id).toBe(projectId);
            expect(row4.redirect_url).toBe(redirectUrl);
            expect(row4.created_at).toBeInstanceOf(Date);
            expect(row4.updated_at).toBeNull();
        });
    });
});
