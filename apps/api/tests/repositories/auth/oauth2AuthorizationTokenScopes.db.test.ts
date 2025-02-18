import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';

describe('OAuth2 Authorization Token Scopes Queries', () => {
    it('should handle inserting or updating authorization token scopes', async () => {
        await db.withRollbackTransaction(async (client) => {
            // insertOrUpdateAuthorizationTokenScopes
        });
    });
});
