import {
    describe,
    it,
    expect,
    jest,
    afterEach,
    beforeAll,
    afterAll
} from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

const mockQuery = jest.fn();

import { validateMFA } from '../../src/services/mfaService';
import {
    INTERNAL_ERROR,
    INVALID_CODE,
    MFA_EMAIL_DISABLED,
    MFA_TOTP_DISABLED
} from 'utils-node/errors';
import { advanceTo, clear } from 'jest-date-mock';
import { getTOTPForVerification } from '../../src/services/totpService';

jest.mock('../../src/db', () => {
    return {
        __esModule: true,
        default: {
            query: mockQuery,
        },
    };
});

describe('MFA Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(() => {
        advanceTo(new Date('2023-09-15T12:00:00'));
    });

    afterAll(() => {
        clear();
    });

    it('should handle with email internal error', async () => {
        mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'email',
            '12345678'
        );

        expect(result).toStrictEqual({
            status: 500,
            info: INTERNAL_ERROR,
        });
    });

    it('should handle with email disabled', async () => {
        mockQuery.mockResolvedValueOnce({
			rows: [
                {
                    email: null,
                    email_code_sent_at: '2023-09-15T11:00:00',
                    email_code: '12345678'
                }
            ],
			rowCount: 1,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'email',
            '12345678'
        );

        expect(result).toStrictEqual({
            status: 400,
            info: MFA_EMAIL_DISABLED
        });
    });

    it('should handle with email invalid code', async () => {
        mockQuery.mockResolvedValueOnce({
			rows: [
                {
                    email: true,
                    email_code_sent_at: '2023-09-15T11:00:00',
                    email_code: '12345678'
                }
            ],
			rowCount: 1,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'email',
            'KLEWROSL'
        );

        expect(result).toStrictEqual({
            status: 403,
            info: INVALID_CODE,
            data: {
                location: 'body',
                path: 'code'
            }
        });
    });

    it('should handle with email valid code', async () => {
        const code = '12345678';

        mockQuery.mockResolvedValueOnce({
			rows: [
                {
                    email: true,
                    email_code_sent_at: '2023-09-15T11:59:00',
                    email_code: code
                }
            ],
			rowCount: 1,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'email',
            code
        );

        expect(result).toBe(null);
    });

    it('should handle with totp internal error', async () => {
        mockQuery.mockResolvedValueOnce({
			rows: [],
			rowCount: 0,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'totp',
            '12345678'
        );

        expect(result).toStrictEqual({
            status: 500,
            info: INTERNAL_ERROR,
        });
    });

    it('should handle with totp disabled', async () => {
        mockQuery.mockResolvedValueOnce({
			rows: [
                {
                    totp_verified_at: null,
                    totp_secret: null
                }
            ],
			rowCount: 1,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'totp',
            '12345678'
        );

        expect(result).toStrictEqual({
            status: 400,
            info: MFA_TOTP_DISABLED
        });
    });

    it('should handle with totp invalid code', async () => {
        mockQuery.mockResolvedValueOnce({
			rows: [
                {
                    totp_verified_at: '2023-09-15T11:00:00',
                    totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ'
                }
            ],
			rowCount: 1,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'totp',
            'KLEWROSL'
        );

        expect(result).toStrictEqual({
            status: 403,
            info: INVALID_CODE,
            data: {
                location: 'body',
                path: 'code'
            }
        });
    });

    it('should handle with totp valid code', async () => {
        const code = getTOTPForVerification(
            'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ',
        ).generate();

        mockQuery.mockResolvedValueOnce({
			rows: [
                {
                    totp_verified_at: '2023-09-15T11:00:00',
                    totp_secret: 'VGQZ4UCUUEC22H4QRRRHK64NKMQC4WBZ'
                }
            ],
			rowCount: 1,
		} as never);

        const userId = uuidv4();

        const result = await validateMFA(
            userId,
            'totp',
            code
        );

        expect(result).toBe(null);
    });
});
