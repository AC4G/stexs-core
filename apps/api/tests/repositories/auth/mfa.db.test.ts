import { describe, expect, it } from '@jest/globals';
import db from '../../../src/db';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser } from '../../../src/repositories/auth/users';
import {
    disableEmailMethod,
    disableTOTPMethod,
    finalizeEnablingEmailMFA,
    getEmailInfo,
    getEmailInfoForDisabling,
    getMFAStatus,
    getTOTPInfoForDisabling,
    getTOTPInfoForEnabling,
    getTOTPStatus,
    setEmailCode,
    setTOTPSecret,
    verifyTOTPMethod
} from '../../../src/repositories/auth/mfa';
import { getTOTPForSettup } from '../../../src/services/totpService';
import { generateCode } from 'utils-node';

describe('MFA Queries', () => {
    it('should handle retrieving Email info for disabling', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getEmailInfoForDisabling(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(true);
            expect(row.totp_verified_at).toBeNull();
            expect(row.email_code).toBeNull();
            expect(row.email_code_sent_at).toBeNull();

            const code = generateCode(8);

            expect((await setEmailCode(
                userId,
                code,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await getEmailInfoForDisabling(
                userId,
                client
            );

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.email).toBe(true);
            expect(row2.totp_verified_at).toBeNull();
            expect(row2.email_code).toBe(code);
            expect(row2.email_code_sent_at).toBeInstanceOf(Date);

            const totp = getTOTPForSettup(email);
            const secret = totp.secret.base32;

            expect((await setTOTPSecret(
                userId,
                secret,
                client
            )).rowCount).toBe(1);

            expect((await verifyTOTPMethod(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount3, rows: rows3 } = await getEmailInfoForDisabling(
                userId,
                client
            );

            const row3 = rows3[0];

            expect(rowCount3).toBe(1);
            expect(row3.email).toBe(true);
            expect(row3.totp_verified_at).toBeInstanceOf(Date);
            expect(row3.email_code).toBe(code);
            expect(row3.email_code_sent_at).toBeInstanceOf(Date);
        });
    });

    it('should retrieving email info', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getEmailInfo(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(true);
            expect(row.email_code).toBeNull();
            expect(row.email_code_sent_at).toBeNull();

            const code = generateCode(8);

            expect((await setEmailCode(
                userId,
                code,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await getEmailInfo(
                userId,
                client
            );

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.email).toBe(true);
            expect(row2.email_code).toBe(code);
            expect(row2.email_code_sent_at).toBeInstanceOf(Date);
        });
    });

    it('should handle setting email code', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId,
                email
            )).rowCount).toBe(1);

            const code = generateCode(8);

            const { rowCount, rows } = await setEmailCode(
                userId,
                code,
                client
            );

            expect(rowCount).toBe(1);
            expect(rows[0].email).toBe(email);

            const { rowCount: rowCount2, rows: rows2 } = await getEmailInfo(
                userId,
                client
            );

            expect(rowCount2).toBe(1);
            expect(rows2[0].email).toBe(true);
            expect(rows2[0].email_code).toBe(code);
            expect(rows2[0].email_code_sent_at).toBeInstanceOf(Date);
        });  
    });

    it('should handle verifying TOTP method', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId,
                email
            )).rowCount).toBe(1);

            const totp = getTOTPForSettup(email);
            const secret = totp.secret.base32;

            expect((await setTOTPSecret(
                userId,
                secret,
                client
            )).rowCount).toBe(1);

            expect((await verifyTOTPMethod(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getTOTPStatus(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.totp_verified_at).toBeInstanceOf(Date);
            expect(row.totp_secret).toBe(secret);
        });
    });

    it('should handle retrieving TOTP status data', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId,
                email
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getTOTPStatus(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.totp_verified_at).toBeNull();
            expect(row.totp_secret).toBeNull();

            const totp = getTOTPForSettup(email);
            const secret = totp.secret.base32;

            expect((await setTOTPSecret(
                userId,
                secret,
                client
            )).rowCount).toBe(1);

            expect((await verifyTOTPMethod(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await getTOTPStatus(
                userId,
                client
            );

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.totp_verified_at).toBeInstanceOf(Date);
            expect(row2.totp_secret).toBe(secret);
        });
    });

    it('should handle disabling TOTP method', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId,
                email
            )).rowCount).toBe(1);

            const totp = getTOTPForSettup(email);
            const secret = totp.secret.base32;

            expect((await setTOTPSecret(
                userId,
                secret,
                client
            )).rowCount).toBe(1);

            expect((await verifyTOTPMethod(
                userId,
                client
            )).rowCount).toBe(1);

            expect((await disableTOTPMethod(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getTOTPStatus(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.totp_verified_at).toBeNull();
            expect(row.totp_secret).toBeNull();
        });
    });

    it('should handle retrieving TOTP info for disabling TOTP method', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId,
                email
            )).rowCount).toBe(1);

            const totp = getTOTPForSettup(email);
	        const secret = totp.secret.base32;

            expect((await setTOTPSecret(
                userId,
                secret,
                client
            )).rowCount).toBe(1);

            expect((await verifyTOTPMethod(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getTOTPInfoForDisabling(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(true);
            expect(row.totp_verified_at).toBeInstanceOf(Date);
            expect(row.totp_secret).toBe(secret);
        });
    });

    it('should handle finalizing enabling email MFA', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            const code = generateCode(8);

            expect((await setEmailCode(
                userId,
                code,
                client
            )).rowCount).toBe(1);

            expect((await finalizeEnablingEmailMFA(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getEmailInfo(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(true);
            expect(row.email_code).toBeNull();
            expect(row.email_code_sent_at).toBeNull();
        });
    });

    it('should handle setting TOTP secret', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId,
                email
            )).rowCount).toBe(1);

            const { rowCount, rows } = await client.query<{
                totp_secret: string | null;
            }>(
                `
                    SELECT
                        totp_secret
                    FROM auth.mfa
                    WHERE user_id = $1::uuid;
                `,
                [userId]
            );

            expect(rowCount).toBe(1);
            expect(rows[0].totp_secret).toBeNull();

            const totp = getTOTPForSettup(email);
	        const secret = totp.secret.base32;

            expect((await setTOTPSecret(
                userId,
                secret,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await client.query<{
                totp_secret: string | null;
            }>(
                `
                    SELECT
                        totp_secret
                    FROM auth.mfa
                    WHERE user_id = $1::uuid;
                `,
                [userId]
            );

            expect(rowCount2).toBe(1);
            expect(rows2[0].totp_secret).toBe(secret);
        });
    });

    it('should handle retrieving TOTP info for enabling TOTP method', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            const email = 'test@example.com';

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getTOTPInfoForEnabling(userId, client);

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(email);
            expect(row.totp_verified_at).toBeNull();

            expect((await verifyTOTPMethod(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount: rowCount2, rows: rows2 } = await getTOTPInfoForEnabling(userId, client);

            const row2 = rows2[0];

            expect(rowCount2).toBe(1);
            expect(row2.email).toBe(email);
            expect(row2.totp_verified_at).toBeInstanceOf(Date);
        });
    });

    it('should handle retrieving MFA status', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();
            
            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getMFAStatus(userId, client);

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(true);
            expect(row.totp).toBe(false);
        });
    });

    it('should handle disabling Email method', async () => {
        await db.withRollbackTransaction(async (client) => {
            const userId = uuidv4();

            expect((await createTestUser(
                client,
                userId
            )).rowCount).toBe(1);

            const code = generateCode(8);

            expect((await setEmailCode(
                userId,
                code,
                client
            )).rowCount).toBe(1);

            expect((await disableEmailMethod(
                userId,
                client
            )).rowCount).toBe(1);

            const { rowCount, rows } = await getEmailInfo(
                userId,
                client
            );

            const row = rows[0];

            expect(rowCount).toBe(1);
            expect(row.email).toBe(false);
            expect(row.email_code).toBeNull();
            expect(row.email_code_sent_at).toBeNull();
        });
    });
});
