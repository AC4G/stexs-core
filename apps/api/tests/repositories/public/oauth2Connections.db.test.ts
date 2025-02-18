import { describe, it, expect } from '@jest/globals';
import db from '../../../src/db';

describe('OAuth2 Connections Queries', () => {
    it('should handle checking if connection exists', async () => {
        await db.withRollbackTransaction(async (client) => {
            // connectionExistsByUserIdAndClientId
        });
    });

    it('should handle creating a connection', async () => {
        await db.withRollbackTransaction(async (client) => {
            // createConnection
        });
    });

    it('should handle creating a oauth2 connection', async () => {
        await db.withRollbackTransaction(async (client) => {
            // createOAuth2Connection
        });
    });
});
