import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { validate } from 'uuid';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createProject } from '../../../src/repositories/public/projects';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';

describe('OAuth2 Apps Queries', () => {
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
