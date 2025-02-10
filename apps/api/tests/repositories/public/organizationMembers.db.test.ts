import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser } from '../../../src/repositories/auth/users';
import { createTestOrganization } from '../../../src/repositories/public/organizations';
import { joinUserToOrganization } from '../../../src/repositories/public/organizationMembers';
import { isUserAdminOrOwnerOfOrganization } from '../../../src/repositories/public/organizationMembers';

describe('Organization Members Queries', () => {
    it('should handle to check if user is admin or owner of organization', async () => {
        await db.withRollbackTransaction(async (client) => {
            const roles = [
                { role: 'Owner', expectedRowCount: 1 },
                { role: 'Admin', expectedRowCount: 1 },
                { role: 'Moderator', expectedRowCount: 0 },
                { role: 'Member', expectedRowCount: 0 },
                { role: null, expectedRowCount: 0 },
            ];

            const { rowCount, rows } = await createTestOrganization(client);

            expect(rowCount).toBe(1);
            expect(rows[0].id).toEqual(expect.any(Number));

            const organizationId = rows[0].id;

            for (const [index, { role, expectedRowCount }] of roles.entries()) {
                const userId = uuidv4();

                expect((await createTestUser(
                    client,
                    userId,
                    `${index}test@example.com`,
                    { username: `testuser${index}` },
                )).rowCount).toBe(1);

                if (role) {
                    expect((await joinUserToOrganization(
                        userId,
                        organizationId,
                        role,
                        client
                    )).rowCount).toBe(1);
                }

                expect((await isUserAdminOrOwnerOfOrganization(
                    userId,
                    organizationId,
                    client
                )).rowCount).toBe(expectedRowCount);
            }
        });
    });

    it('should handle joining user to an organization', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();

            expect((await createTestUser(
                client,
                userId,
            )).rowCount).toBe(1);

            const { rowCount, rows } = await createTestOrganization(client);

            expect(rowCount).toBe(1);
            expect(rows[0].id).toEqual(expect.any(Number));

            expect((await joinUserToOrganization(
                userId,
                rows[0].id,
                'Owner',
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await client.query(
                `
                    SELECT
                        id,
                        member_id,
                        organization_id,
                        role,
                        created_at,
                        updated_at
                    FROM public.organization_members
                    WHERE member_id = $1::uuid
                        AND organization_id = $2::integer;
                `,
                [userId, rows[0].id]
            );

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.member_id).toBe(userId);
            expect(row2.organization_id).toBe(rows[0].id);
            expect(row2.role).toBe('Owner');
            expect(row2.created_at).toBeInstanceOf(Date);
            expect(row2.updated_at).toBeNull();
        });
    });
});
