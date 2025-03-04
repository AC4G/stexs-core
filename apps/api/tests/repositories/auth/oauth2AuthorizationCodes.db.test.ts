import { describe, it, expect } from "@jest/globals";
import db from '../../../src/db';
import { createOrganization } from "../../../src/repositories/public/organizations";
import { createOAuth2App } from "../../../src/repositories/public/oauth2Apps";
import { v4 as uuidv4 } from 'uuid';
import { createUser } from "../../../src/repositories/auth/users";
import {
    deleteAuthorizationCode,
    setAuthorizationCode,
    validateAuthorizationCode
} from "../../../src/repositories/auth/oauth2AuthorizationCodes";
import { insertOrUpdateAuthorizationCodeScopes } from "../../../src/repositories/auth/oauth2AuthorizationCodeScopes";

describe('OAuth2 Authorization Codes Queries', () => {
    it('should handle deleting authorization code', async () => {
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

            const clientId = row2.client_id;

            const userId = uuidv4();
            
            expect((await createUser(
                client,
                userId,
            )).rowCount).toBe(1);

            const code = uuidv4();

            const { rowCount: rowCount3, rows: rows3 } = await setAuthorizationCode(
                code,
                userId,
                clientId,
                client
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);

            const codeId = row3.id;

            const scopes = [
                'inventory.read',
                'inventory.write',
                'inventory.update',
                'inventory.delete',
            ];

            expect((await insertOrUpdateAuthorizationCodeScopes(
                codeId,
                scopes,
                client
            )).rowCount).toBe(4);

            expect((await deleteAuthorizationCode(codeId, client)).rowCount).toBe(1);

            const { rowCount: rowCount4 } = await client.query(
                `
                    SELECT 1
                    FROM auth.oauth2_authorization_codes
                    WHERE id = $1::integer;
                `,
                [codeId]
            );

            expect(rowCount4).toBe(0);

            const { rowCount: rowCount5 } = await client.query(
                `
                    SELECT 1
                    FROM auth.oauth2_authorization_code_scopes
                    WHERE code_id = $1::integer;
                `,
                [codeId]
            );

            expect(rowCount5).toBe(0);
        });
    });

    it('should handle validating authorization code', async () => {
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

            const clientId = row2.client_id;
            const clientSecret = row2.client_secret;

            const userId = uuidv4();
            
            expect((await createUser(
                client,
                userId,
            )).rowCount).toBe(1);

            const code = uuidv4();

            const { rowCount: rowCount3, rows: rows3 } = await setAuthorizationCode(
                code,
                userId,
                clientId,
                client
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);

            const codeId = row3.id;

            const { rowCount: rowCount4, rows: rows4 } = await validateAuthorizationCode(
                code,
                clientId,
                clientSecret,
                client
            );

            const row4 = rows4[0];

            expect(rowCount4).toBe(1);
            expect(row4.id).toEqual(expect.any(Number));
            expect(row4.user_id).toBe(userId);
            expect(row4.scope_ids.length).toBe(0);
            expect(row4.organization_id).toBe(organizationId);
            expect(row4.created_at).toBeInstanceOf(Date);

            const scopes = [
                'inventory.read',
                'inventory.write',
                'inventory.update',
                'inventory.delete',
            ];

            expect((await insertOrUpdateAuthorizationCodeScopes(
                codeId,
                scopes,
                client
            )).rowCount).toBe(4);

            const { rowCount: rowCount5, rows: rows5 } = await validateAuthorizationCode(
                code,
                clientId,
                clientSecret,
                client
            );

            const row5 = rows5[0];

            expect(rowCount5).toBe(1);
            expect(row5.scope_ids.length).toBe(4);
        });
    });

    it('should handle setting authorization code', async () => {
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

            const userId = uuidv4();
            
            expect((await createUser(
                client,
                userId,
            )).rowCount).toBe(1);

            const code = uuidv4();

            const { rowCount: rowCount3, rows: rows3 } = await setAuthorizationCode(
                code,
                userId,
                clientId,
                client
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);

            expect(row3.id).toEqual(expect.any(Number));
            expect(row3.created_at).toBeInstanceOf(Date);

            const { rowCount: rowCount4, rows: rows4 } = await client.query<{
                id: number;
                code: string;
                user_id: string;
                app_id: number;
                created_at: Date;
            }>(
                `
                    SELECT
                        id,
                        code,
                        user_id,
                        app_id,
                        created_at
                    FROM auth.oauth2_authorization_codes
                    WHERE id = $1::integer;
                `,
                [row3.id]
            );

            const row4 = rows4[0];

            expect(rowCount4).toBe(1);
            expect(row4.id).toEqual(expect.any(Number));
            expect(row4.code).toBe(code);
            expect(row4.user_id).toBe(userId);
            expect(row4.app_id).toBe(appId);
            expect(row4.created_at).toBeInstanceOf(Date);
        });
    });
});
