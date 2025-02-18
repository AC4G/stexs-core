import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';

describe('OAuth2 Connection Scopes Queries', () => {
    it('should handle updating connection scopes', async () => {
        await db.withRollbackTransaction(async (client) => {
            // updateConnectionScopes
        });
    });
});
