import { describe, expect, it } from '@jest/globals';
import db from '../../../src/db';
import { deleteRefreshToken } from '../../../src/repositories/auth/refreshTokens';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser } from '../../../src/repositories/auth/users';

describe('Token Queries', () => {
    it('should handle deleting refresh token', async () => {
        await db.withRollbackTransaction(async (client) => {
            const sub = uuidv4();
            const jti = uuidv4();
            const session_id = uuidv4();

            expect((await createTestUser(
                client,
                sub
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
                [sub, jti, session_id]
            )).rowCount).toBe(1);

            expect((await deleteRefreshToken(
                sub,
                jti,
                session_id,
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
                [sub, jti, session_id]
            )).rowCount).toBe(0);
        });
    });
});
