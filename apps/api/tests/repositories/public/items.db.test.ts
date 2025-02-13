import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createProject } from '../../../src/repositories/public/projects';
import { createItem, isClientAllowedToAccessProjectByItemId } from '../../../src/repositories/public/items';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';

describe('Items Queries', () => {
    it('should handle check if client is allowed to access project by item id', async () => {
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

            const { rowCount: rowCount4, rows: rows4 } = await createItem(
                client,
                'TestItem',
                projectId
            );

            const itemId = rows4[0].id;

            expect(rowCount4).toBe(1);

            const { rowCount: rowCount5, rows: rows5 } = await createOAuth2App(
                'Test OAuth2 App',
                organizationId,
                projectId,
                'https://example.com/callback',
                client
            );

            const clientId = rows5[0].client_id;

            expect(rowCount5).toBe(1);

            expect((await isClientAllowedToAccessProjectByItemId(
                itemId,
                organizationId,
                clientId,
                client
            )).rowCount).toBe(1);
            
            const { rowCount: rowCount6, rows: rows6 } = await createItem(
                client,
                'TestItem2',
                projectId2
            );

            const itemId2 = rows6[0].id;

            expect(rowCount6).toBe(1);

            expect((await isClientAllowedToAccessProjectByItemId(
                itemId2,
                organizationId,
                clientId,
                client
            )).rowCount).toBe(0);

            const { rowCount: rowCount7, rows: rows7 } = await createOAuth2App(
                'Test OAuth2 App No Project',
                organizationId,
                null,
                'https://example.com/callback',
                client
            );

            const clientIdNoProject = rows7[0].client_id;

            expect(rowCount7).toBe(1);

            expect((await isClientAllowedToAccessProjectByItemId(
                itemId2,
                organizationId,
                clientIdNoProject,
                client
            )).rowCount).toBe(1);

            expect((await isClientAllowedToAccessProjectByItemId(
                itemId,
                organizationId,
                clientIdNoProject,
                client
            )).rowCount).toBe(1);
        });
    });

    it('should handle creating an item', async () => {
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

            const { rowCount: rowCount3, rows: rows3 } = await createItem(
                client,
                'TestItem',
                projectId,
            );

            const itemId = rows3[0].id;

            expect(rowCount3).toBe(1);
            expect(itemId).toEqual(expect.any(Number));

            const { rowCount: rowCount4, rows: rows4 } = await client.query<{
              name: string,
              parameter: Record<string, any>,
              description: string | null,
              project_id: number,
              is_private: boolean,
              created_at: Date,
              updated_at: Date | null  
            }>(
                `
                    SELECT
                        name,
                        parameter,
                        description,
                        project_id,
                        is_private,
                        created_at,
                        updated_at
                    FROM public.items
                    WHERE id = $1::integer;
                `,
                [itemId]
            );

            const row4 = rows4[0];

            expect(rowCount4).toBe(1);
            expect(row4.name).toBe('TestItem');
            expect(row4.parameter).toEqual({});
            expect(row4.description).toBeNull();
            expect(row4.project_id).toBe(projectId);
            expect(row4.is_private).toBe(false);
            expect(row4.created_at).toBeInstanceOf(Date);
            expect(row4.updated_at).toBeNull();
        });
    });
});
