import {
	CODE_EXPIRED,
	INTERNAL_ERROR,
	INVALID_CODE,
	MFA_EMAIL_DISABLED,
	TOTP_DISABLED,
} from 'utils-node/errors';
import db from '../db';
import logger from '../loggers/logger';
import { getTOTPForVerification } from './totpService';
import { isExpired } from 'utils-node';

export interface MFAError {
	status: number;
	info: {
		code: string;
		message: string;
	};
	data?: Record<string, any>;
}

export async function validateMFA(
	userId: string,
	type: string,
	code: string,
): Promise<MFAError | null> {
	try {
		if (type === 'totp') {
			const { rows, rowCount } = await db.query<{
				totp: boolean;
				totp_secret: string | null;
			}>(
				`
					SELECT 
						totp, 
						totp_secret 
					FROM auth.mfa
					WHERE user_id = $1::uuid;
				`,
				[userId],
			);

			if (!rowCount || rowCount === 0) {
				logger.error(
					`Failed to fetch MFA totp code and totp_secret for user: ${userId}`,
				);
				return {
					status: 500,
					info: INTERNAL_ERROR,
				};
			}

			if (!rows[0].totp || !rows[0].totp_secret) {
				logger.debug(`MFA TOTP is disabled for user: ${userId}`);
				return {
					status: 400,
					info: TOTP_DISABLED,
				};
			}

			const totp = getTOTPForVerification(rows[0].totp_secret);

			if (totp.validate({ token: code, window: 1 })) {
				logger.debug(`Invalid code provided for MFA TOTP password change for user: ${userId}`);
				return {
					status: 403,
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				};
			}
		}

		if (type === 'email') {
			const { rowCount, rows } = await db.query<{
				email: boolean;
				email_code: string | null;
				email_code_sent_at: string | null;
			}>(
				`
					SELECT 
						email, 
						email_code, 
						email_code_sent_at
					FROM auth.mfa
					WHERE user_id = $1::uuid;
				`,
				[userId],
			);

			if (!rowCount || rowCount === 0) {
				logger.error(
					`Failed to fetch MFA email status, code and timestamp for user: ${userId}`,
				);
				return {
					status: 500,
					info: INTERNAL_ERROR,
				};
			}

			if (!rows[0].email) {
				logger.debug(`MFA email is disabled for user: ${userId}`);
				return {
					status: 400,
					info: MFA_EMAIL_DISABLED,
				};
			}

			if (code !== rows[0].email_code) {
				logger.debug(`Invalid MFA code provided for user: ${userId}`);
				return {
					status: 403,
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				};
			}

			const emailCodeSentAt = rows[0].email_code_sent_at;

			if (!emailCodeSentAt || isExpired(emailCodeSentAt, 5)) {
				logger.debug(`MFA code expired for user: ${userId}`);
				return {
					status: 403,
					info: CODE_EXPIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				};
			}
		}
	} catch (e) {
		logger.error(
			`Error while checking MFA code for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return {
			status: 500,
			info: INTERNAL_ERROR,
		};
	}

	return null;
}
