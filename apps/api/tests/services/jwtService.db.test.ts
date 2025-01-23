import { describe, expect, it } from "@jest/globals";
import db from "../../src/db";
import { createTestUser } from "../../src/repositories/auth/users";
import { v4 as uuidv4 } from "uuid";
import { saveRefreshToken } from '../../src/repositories/auth/refreshTokens';

describe('JWT Service Queries', () => {
    it('should handle saving refresh token for grant type password', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();

            expect((await createTestUser(
                client,
                userId,
            )).rowCount).toBe(1);

            expect((await saveRefreshToken(
                uuidv4(),
                userId,
                'password',
                uuidv4(),
                null,
                client
            )).rowCount).toBe(1);
        });
    });

    it('should handle updating refresh token for grant type athorization code', async () => {
        // TODO: requires client and connection creation queries
    });
});
