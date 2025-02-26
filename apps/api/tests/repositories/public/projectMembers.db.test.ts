import {
    describe,
    it,
    expect
} from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createProject } from '../../../src/repositories/public/projects';
import {
    isUserAdminOrOwnerOfProject,
    isUserAdminOrOwnerOfProjectByItemId,
    joinUserToProject
} from '../../../src/repositories/public/projectMembers';
import { createUser } from '../../../src/repositories/auth/users';
import { v4 as uuidv4 } from 'uuid';
import { createItem } from '../../../src/repositories/public/items';

describe('Project Members Queries', () => {
    it('should handle check if user is admin or owner of a project by item id', async () => {
        await db.withRollbackTransaction(async (client) => {
            const roles = [
                { role: 'Owner', expectedRowCount: 1 },
                { role: 'Admin', expectedRowCount: 1 },
                { role: 'Moderator', expectedRowCount: 0 },
                { role: 'Member', expectedRowCount: 0 },
                { role: null, expectedRowCount: 0 },
            ];

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

            const { rowCount: rowCount3, rows: rows3 } = await createItem(
                client,
                'TestItem',
                projectId
            );

            const itemId = rows3[0].id;

            expect(rowCount3).toBe(1);

            for (const [index, { role, expectedRowCount }] of roles.entries()) {
                const userId = uuidv4();

                expect((await createUser(
                    client,
                    userId,
                    `${index}test@example.com`,
                    { username: `testuser${index}` },
                )).rowCount).toBe(1);

                if (role) {
                    expect((await joinUserToProject(
                        projectId,
                        userId,
                        role,
                        client
                    )).rowCount).toBe(1);
                }

                expect((await isUserAdminOrOwnerOfProjectByItemId(
                    userId,
                    itemId,
                    client
                )).rowCount).toBe(expectedRowCount);
            }
        });
    })

    it('should handle check if user is admin or owner of project', async () => {
        await db.withRollbackTransaction(async (client) => {
            const roles = [
                { role: 'Owner', expectedRowCount: 1 },
                { role: 'Admin', expectedRowCount: 1 },
                { role: 'Moderator', expectedRowCount: 0 },
                { role: 'Member', expectedRowCount: 0 },
                { role: null, expectedRowCount: 0 },
            ];

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

            for (const [index, { role, expectedRowCount }] of roles.entries()) {
                const userId = uuidv4();

                expect((await createUser(
                    client,
                    userId,
                    `${index}test@example.com`,
                    { username: `testuser${index}` },
                )).rowCount).toBe(1);

                if (role) {
                    expect((await joinUserToProject(
                        projectId,
                        userId,
                        role,
                        client
                    )).rowCount).toBe(1);
                }

                expect((await isUserAdminOrOwnerOfProject(
                    userId,
                    projectId,
                    client
                )).rowCount).toBe(expectedRowCount);
            }
        });
    });
    
    it('should handle joining a user to a project', async () => {
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

            const userId = uuidv4();

            expect((await createUser(
                client,
                userId
            )).rowCount).toBe(1);

            const role = 'Owner';

            expect((await joinUserToProject(
                projectId,
                userId,
                role,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount3, rows: rows3 } = await client.query<{
                id: number;
                member_id: string;
                project_id: number;
                role: string;
                created_at: Date;
                updated_at: Date | null;
            }>(
                `
                    SELECT
                        id,
                        member_id,
                        project_id,
                        role,
                        created_at,
                        updated_at
                    FROM public.project_members
                    WHERE member_id = $1::uuid
                        AND project_id = $2::integer;
                `,
                [userId, projectId]
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.id).toEqual(expect.any(Number));
            expect(row3.member_id).toBe(userId);
            expect(row3.project_id).toBe(projectId);
            expect(row3.role).toBe(role);
            expect(row3.created_at).toBeInstanceOf(Date);
            expect(row3.updated_at).toBeNull();
        });
    });
});
