import { describe, it } from "@jest/globals";
import db from '../../../src/db';

describe('OAuth2 Authorization Codes Queries', () => {
    it('should handle deleting authorization code', async () => {
        await db.withRollbackTransaction(async (client) => {
            // deleteAuthorizationCode
        });
    });

    it('should handle validating authorization code', async () => {
        await db.withRollbackTransaction(async (client) => {
            // validateAuthorizationCode
        });
    });

    it('should handle setting authorization code', async () => {
        await db.withRollbackTransaction(async (client) => {
            // setAuthorizationCode
        });
    });
});
