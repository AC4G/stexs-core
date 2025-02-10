import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createTestOrganization } from '../../../src/repositories/public/organizations';
import { createTestProject } from '../../../src/repositories/public/projects';

describe('Projects Queries', () => {
    it('should handle creating a test project', async () => {
        await db.withRollbackTransaction(async (client) => {
            const { rowCount, rows } = await createTestOrganization(client); 

            expect(rowCount).toBe(1);
            expect(rows[0].id).toEqual(expect.any(Number));

            const { rowCount: rowCount2, rows: rows2 } = await createTestProject(client, rows[0].id);

            expect(rowCount2).toBe(1);
            expect(rows2[0].id).toEqual(expect.any(Number));

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
                [rows2[0].id]
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.id).toEqual(expect.any(Number));
            expect(row3.name).toBe('test-project');
            expect(row3.organization_id).toBe(rows[0].id);
            expect(row3.description).toBeNull();
            expect(row3.readme).toBeNull();
            expect(row3.email).toBeNull();
            expect(row3.url).toBeNull();
            expect(row3.created_at).toBeInstanceOf(Date);
            expect(row3.updated_at).toBeNull();
        });
    });
});
