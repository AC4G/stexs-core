import { describe, expect, it } from '@jest/globals';
import db from '../../../src/db';
import { signUpUser } from '../../../src/repositories/auth/users';
import { v4 as uuidv4 } from 'uuid';

describe('Sign Up Queries', () => {
    it('should handle inserting a new user', async () => {
        await db.withRollbackTransaction(async (client) => {            
            const email = 'test@example.com';
            const password = 'test-password'; 
            const username = 'testuser';
            const token = uuidv4();

            expect((await signUpUser(
                email,
                password,
                username,
                token,
                client
            )).rowCount).toBe(1);

            expect((await client.query(
                `
                    SELECT 1
                    FROM auth.users AS u
                    JOIN public.profiles AS p ON p.user_id = u.id
                    WHERE u.email = $1::text;
                `,
                [email]
            )).rowCount).toBe(1);
        });
    });

    it('should handle inserting a new user with existing email', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const password = 'test-password';
            const username = 'testuser';
            const differentUsername = 'differentuser';
            const token = uuidv4();

            expect((await signUpUser(
                email,
                password,
                username,
                token,
                client
            )).rowCount).toBe(1);

            try {
                await signUpUser(
                    email,
                    password,
                    differentUsername,
                    token,
                    client
                );
            } catch (e) {
                const err = e as { hint: string | null };

                expect(err.hint).toBe('Please choose a different email');
            }
        });
    });

    it('should handle inserting a new user with existing username', async () => {
        await db.withRollbackTransaction(async (client) => {
            const email = 'test@example.com';
            const differentEmail = 'different@example.com';
            const password = 'test-password';
            const username = 'testuser';
            const token = uuidv4();

            expect((await signUpUser(
                email,
                password,
                username,
                token,
                client
            )).rowCount).toBe(1);

            try {
                await signUpUser(
                    differentEmail,
                    password,
                    username,
                    token,
                    client
                );

                console.error('should not be reached');
            } catch (e) {
                const err = e as { hint: string | null };

                expect(err.hint).toBe('Please choose a different username');
            }
        });
    });
});
