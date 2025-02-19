import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';

describe('OAuth2 Authorization Code Scopes Queries', () => {
    it('should handle inserting or updating authorization code scopes', async () => {
        await db.withRollbackTransaction(async (client) => {
            // insertOrUpdateAuthorizationCodeScopes
        });
    });
});
