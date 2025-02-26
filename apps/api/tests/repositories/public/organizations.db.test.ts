import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';

describe('Organizations Queries', () => {
    it('should handle creating a test organization', async () => {
        await db.withRollbackTransaction(async (client) => {
            const name = 'TestOrganization';
            
            const { rowCount, rows } = await createOrganization(client, name);

            expect(rowCount).toBe(1);
            expect(rows[0].id).toEqual(expect.any(Number));

            const { rowCount: rowCount2, rows: rows2 } = await client.query<{
                id: number;
                name: string;
                display_name: string | null;
                description: string | null;
                readme: string | null;
                created_at: Date;
                updated_at: Date | null;
            }>(
                `
                    SELECT
                        id,
                        name,
                        display_name,
                        description,
                        readme,
                        created_at,
                        updated_at
                    FROM public.organizations
                    WHERE id = $1::integer;
                `,
                [rows[0].id]
            );

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.id).toEqual(expect.any(Number));
            expect(row2.name).toBe(name);
            expect(row2.display_name).toBeNull();
            expect(row2.description).toBeNull();
            expect(row2.readme).toBeNull();
            expect(row2.created_at).toBeInstanceOf(Date);
            expect(row2.updated_at).toBeNull();
        });
    });
});
