import { describe, expect, it } from '@jest/globals';
import db from '../../../src/db';
import { deleteRefreshToken } from '../../../src/repositories/auth/refreshTokens';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser } from '../../../src/repositories/auth/users';

describe('Token Queries', () => {
    it('should handle deleting refresh token', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const token = uuidv4();
            const sessionId = uuidv4();

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            expect((await client.query(
                `
                    INSERT INTO auth.refresh_tokens (
                        user_id,
                        grant_type,
                        token,
                        session_id
                    ) VALUES (
                        $1::uuid,
                        'password',
                        $2::uuid,
                        $3::uuid
                    );
                `,
                [
                    userId,
                    token,
                    sessionId
                ]
            )).rowCount).toBe(1);

            expect((await deleteRefreshToken(
                userId,
                token,
                sessionId,
                client
            )).rowCount).toBe(1);

            expect((await client.query(
                `
                    SELECT 1
                    FROM auth.refresh_tokens
                    WHERE user_id = $1::uuid
                        AND grant_type = 'password'
                        AND token = $2::uuid
                        AND session_id = $3::uuid;
                `,
                [
                    userId,
                    token,
                    sessionId
                ]
            )).rowCount).toBe(0);
        });
    });
});
