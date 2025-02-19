import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';
import { createOrganization } from '../../../src/repositories/public/organizations';
import { createOAuth2App } from '../../../src/repositories/public/oauth2Apps';
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../../src/repositories/auth/users';
import { setAuthorizationCode } from '../../../src/repositories/auth/oauth2AuthorizationCodes';
import { insertOrUpdateAuthorizationCodeScopes } from '../../../src/repositories/auth/oauth2AuthorizationCodeScopes';

describe('OAuth2 Authorization Code Scopes Queries', () => {
    it('should handle inserting or updating authorization code scopes', async () => {
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
                'item.read',
	            'item.update',
	            'item.delete',
	            'item.write'
            ];

            expect((await insertOrUpdateAuthorizationCodeScopes(
                codeId,
                scopes,
                client
            )).rowCount).toBe(4);
        });
    });
});
