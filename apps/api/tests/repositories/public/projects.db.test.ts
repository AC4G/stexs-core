import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createProject, isClientAllowedToAccessProject } from '../../../src/repositories/public/projects';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';

describe('Projects Queries', () => {
    it('should validate client access to projects in different scenarios', async () => {
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

            const { rowCount: rowCount3, rows: rows3 } = await createProject(
                client,
                organizationId,
                'TestProject2'
            );

            const projectId2 = rows3[0].id;

            expect(rowCount3).toBe(1);

            const { rowCount: rowCount4, rows: rows4 } = await createOAuth2App(
                'Test OAuth2 App',
                organizationId,
                projectId,
                'https://example.com/callback',
                client
            );

            const clientId = rows4[0].client_id;

            expect(rowCount4).toBe(1);

            expect((await isClientAllowedToAccessProject(
                organizationId,
                projectId2,
                clientId,
                client
            )).rowCount).toBe(0);

            const { rowCount: rowCount5, rows: rows5 } = await createOAuth2App(
                'Test OAuth2 App No Project',
                organizationId,
                null,
                'https://example.com/callback',
                client
            );

            const clientIdNoProject = rows5[0].client_id;

            expect(rowCount5).toBe(1);

            const { rowCount: rowCount6, rows: rows6 } = await createProject(
                client,
                organizationId,
                'TestProject3'
            );

            const projectId3 = rows6[0].id;

            expect(rowCount6).toBe(1);

            expect((await isClientAllowedToAccessProject(
                organizationId,
                projectId3,
                clientIdNoProject,
                client
            )).rowCount).toBe(1);

            expect((await isClientAllowedToAccessProject(
                organizationId,
                projectId,
                clientId,
                client
            )).rowCount).toBe(1);
        });
    });

    it('should handle creating a test project', async () => {
        await db.withRollbackTransaction(async (client) => {
            const { rowCount, rows } = await createOrganization(client, 'TestOrganization'); 

            const organizationId = rows[0].id;

            expect(rowCount).toBe(1);

            const projectName = 'TestProject';

            const { rowCount: rowCount2, rows: rows2 } = await createProject(
                client,
                organizationId,
                projectName
            );

            const projectId = rows2[0].id;

            expect(rowCount2).toBe(1);
            expect(projectId).toEqual(expect.any(Number));

            const { rowCount: rowCount3, rows: rows3 } = await client.query(
                `
                    SELECT
                        id,
                        name,
                        organization_id,
                        description,
                        readme,
                        email,
                        url,
                        created_at,
                        updated_at
                    FROM public.projects
                    WHERE id = $1::integer;
                `,
                [projectId]
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.id).toEqual(projectId);
            expect(row3.name).toBe(projectName);
            expect(row3.organization_id).toBe(organizationId);
            expect(row3.description).toBeNull();
            expect(row3.readme).toBeNull();
            expect(row3.email).toBeNull();
            expect(row3.url).toBeNull();
            expect(row3.created_at).toBeInstanceOf(Date);
            expect(row3.updated_at).toBeNull();
        });
    });
});
