import {
	expect,
	describe,
	it,
} from '@jest/globals';
import db from '../../testDb';
import { v4 as uuidv4 } from 'uuid';

describe('Email Verification Queries', () => {
    it('should handle querying email verification state', async () => {
        const email = 'test@example.com';
        const token = uuidv4();
        const email_verified_at = new Date();
        const verification_sent_at = new Date();

        await db.query(
            `
                INSERT INTO auth.users (
                    email,
                    raw_user_meta_data,
                    verification_token,
                    encrypted_password,
                    email_verified_at,
                    verification_sent_at
                ) VALUES (
                    $1::text,
                    $2::jsonb,
                    $3::uuid,
                    $4::text,
                    $5::timestamptz,
                    $6::timestamptz
                );
            `,
            [
                email,
                { username: 'test' },
                token,
                'encrypted-password',
                email_verified_at,
                verification_sent_at,
            ],
        )

        
        const { rowCount, rows } = await db.query<{
            email_verified_at: Date | null;
            verification_sent_at: Date | null;
        }>(
            `
                SELECT
                    email_verified_at,
                    verification_sent_at
                FROM auth.users
                WHERE email = $1::text
                    AND verification_token = $2::uuid;
            `,
            [email, token],
        );

        expect(rowCount).toBe(1);
        expect(rows[0].email_verified_at).toEqual(email_verified_at);
        expect(rows[0].verification_sent_at).toEqual(verification_sent_at);
    });
});