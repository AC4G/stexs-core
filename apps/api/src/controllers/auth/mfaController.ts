import { Request } from 'express-jwt';
import logger from '../../logger';
import { message } from 'utils-node/messageBuilder';
import {
	CODE_EXPIRED,
	INTERNAL_ERROR,
	INVALID_CODE,
	MFA_CANNOT_BE_COMPLETELY_DISABLED,
	MFA_EMAIL_ALREADY_DISABLED,
	MFA_EMAIL_ALREADY_ENABLED,
	MFA_TOTP_ALREADY_DISABLED,
	MFA_TOTP_ALREADY_ENABLED,
	MFA_TOTP_ALREADY_VERIFIED,
} from 'utils-node/errors';
import { getTOTPForSettup, getTOTPForVerification } from '../../utils/totp';
import { generateCode, isExpired } from 'utils-node';
import { sendEmailMessage } from '../../producers/emailProducer';
import {
	disableEmailMethod,
	disableTOTPMethod,
	finalizeEnablingEmailMFA,
	getEmailInfo,
	getEmailInfoForDisabling,
	getTOTPInfoForDisabling,
	getTOTPInfoForEnabling,
	getTOTPStatus,
	setEmailCode,
	setTOTPSecret,
	verifyTOTPMethod
} from '../../repositories/auth/mfa';
import { MFA_EMAIL_CODE_EXPIRATION } from '../../../env-config';
import db from '../../db';
import AppError from '../../utils/appError';
import { AsyncHandlerResult } from '../../utils/asyncHandler';

export async function enableTOTP(req: Request): Promise<AsyncHandlerResult> {
	const userId = req.auth?.sub!;

	const { rowCount, rows } = await getTOTPInfoForEnabling(userId);

	if (!rowCount) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while checking MFA status.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'MFA TOTP status not found',
				meta: { userId },
			}
		});
	}

	if (rows[0].totp_verified_at) {
		throw new AppError({
			status: 400,
			message: 'MFA TOTP is already enabled.',
			errors: [{ info: MFA_TOTP_ALREADY_ENABLED }],
			log: {
				level: 'debug',
				message: 'MFA TOTP is already enabled',
				meta: { userId },
			}
		});
	}

	const email = rows[0].email;

	const totp = getTOTPForSettup(email);
	const secret = totp.secret.base32;

	const { rowCount: rowCount2 } = await setTOTPSecret(userId, secret);

	if (!rowCount2) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while setting MFA TOTP secret.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Setting MFA TOTP secret failed',
				meta: { userId },
			}
		});
	}

	return message('MFA TOTP successfully initialized.', {
		secret,
		otp_auth_uri: totp.toString(),
	});
}

export async function enableEmail(req: Request): Promise<AsyncHandlerResult> {
	const userId = req.auth?.sub!;
	const code: string = req.body.code;

	const { rowCount, rows } = await getEmailInfo(userId);

	if (!rowCount) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while checking MFA email status.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to fetch MFA email code and timestamp',
				meta: { userId },
			}
		});
	}

	const row = rows[0];

	if (row.email) {
		throw new AppError({
			status: 400,
			message: 'MFA email is already enabled.',
			errors: [{ info: MFA_EMAIL_ALREADY_ENABLED }],
			log: {
				level: 'debug',
				message: 'MFA email is already enabled',
				meta: { userId },
			}
		});
	}

	if (code !== row.email_code) {
		throw new AppError({
			status: 403,
			message: 'Invalid MFA activation code provided.',
			errors: [
				{
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					}
				}
			],
			log: {
				level: 'debug',
				message: 'Invalid MFA activation code provided',
				meta: { userId },
			}
		});
	}

	const emailCodeSentAt = row.email_code_sent_at;

	if (!emailCodeSentAt || isExpired(emailCodeSentAt, MFA_EMAIL_CODE_EXPIRATION)) {
		throw new AppError({
			status: 403,
			message: 'MFA activation code expired.',
			errors: [
				{
					info: CODE_EXPIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			],
			log: {
				level: 'debug',
				message: 'MFA activation code expired',
				meta: { userId },
			}
		});
	}

	const { rowCount: rowCount2 } = await finalizeEnablingEmailMFA(userId);

	if (!rowCount2) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while enabling MFA email.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to update MFA email status, code and timestamp',
				meta: { userId },
			}
		});
	}

	logger.debug('Successfully enabled MFA email', { userId });

	return message('Email MFA successfully enabled.');
}

export async function disableTOTP(req: Request): Promise<AsyncHandlerResult> {
	const userId = req.auth?.sub!;
	const code: string = req.body.code;

	const { rowCount, rows } = await getTOTPInfoForDisabling(userId);

	if (!rowCount) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while checking MFA status.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to fetch MFA TOTP status and secret',
				meta: { userId },
			}
		});
	}

	const row = rows[0];

	if (!row.totp_verified_at) {
		throw new AppError({
			status: 400,
			message: 'MFA TOTP is already disabled.',
			errors: [{ info: MFA_TOTP_ALREADY_DISABLED }],
			log: {
				level: 'debug',
				message: 'MFA TOTP is already disabled',
				meta: { userId },
			}
		});
	}

	if (!row.email) {
		throw new AppError({
			status: 400,
			message: 'MFA TOTP cant be disabled because this is the last active MFA method.',
			errors: [{ info: MFA_CANNOT_BE_COMPLETELY_DISABLED }],
			log: {
				level: 'debug',
				message: 'MFA TOTP cant be disabled because this is the last active MFA method',
				meta: { userId },
			}
		});
	}

	const secret = row.totp_secret!;

	const totp = getTOTPForVerification(secret);

	if (totp.validate({ token: code, window: 1 }) === null) {
		throw new AppError({
			status: 403,
			message: 'Invalid code provided.',
			errors: [
				{
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			],
			log: {
				level: 'debug',
				message: 'Invalid code provided for MFA TOTP',
				meta: { userId },
			}
		});
	}

	const { rowCount: rowCount2 } = await disableTOTPMethod(userId)

	if (!rowCount2) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while disabling MFA TOTP.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to update MFA TOTP status, secret and timestamp',
				meta: { userId },
			}
		});
	}

	logger.debug('Successfully disabled MFA TOTP', { userId });

	return message('TOTP MFA successfully disabled.');
}

export async function disableEmail(req: Request): Promise<AsyncHandlerResult> {
	const userId = req.auth?.sub!;
	const code: string = req.body.code;

	const { rowCount, rows } = await getEmailInfoForDisabling(userId);

	if (!rowCount) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while checking MFA status.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to fetch MFA email code and timestamp',
				meta: { userId },
			}
		});
	}

	const row = rows[0];

	if (!row.email) {
		throw new AppError({
			status: 400,
			message: 'MFA email is already disabled.',
			errors: [{ info: MFA_EMAIL_ALREADY_DISABLED }],
			log: {
				level: 'debug',
				message: 'MFA email is already disabled',
				meta: { userId },
			}
		});
	}

	if (!row.totp_verified_at) {
		throw new AppError({
			status: 400,
			message: 'MFA email cant be disabled because this is the last active MFA method.',
			errors: [{ info: MFA_CANNOT_BE_COMPLETELY_DISABLED }],
			log: {
				level: 'debug',
				message: 'MFA email cant be disabled because this is the last active MFA method',
				meta: { userId },
			}
		});
	}

	if (code !== row.email_code) {
		throw new AppError({
			status: 403,
			message: 'Invalid code provided.',
			errors: [
				{
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			],
			log: {
				level: 'debug',
				message: 'Invalid code provided for MFA email',
				meta: { userId },
			}
		});
	}

	const emailCodeSentAt = row.email_code_sent_at;

	if (!emailCodeSentAt || isExpired(emailCodeSentAt, MFA_EMAIL_CODE_EXPIRATION)) {
		throw new AppError({
			status: 403,
			message: 'Provided code expired.',
			errors: [
				{
					info: CODE_EXPIRED,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			],
			log: {
				level: 'debug',
				message: 'MFA code expired',
				meta: { userId },
			}
		});
	}

	const { rowCount: rowCount2 } = await disableEmailMethod(userId);

	if (!rowCount2) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while disabling MFA email.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to update MFA email status, code and timestamp',
				meta: { userId },
			}
		});
	}

	logger.debug('Successfully disabled MFA email', { userId });

	return message('Email MFA successfully disabled.');
}

export async function verifyTOTP(req: Request): Promise<AsyncHandlerResult> {
	const userId = req.auth?.sub!;
	const code: string = req.body.code;

	const { rowCount, rows } = await getTOTPStatus(userId);

	if (!rowCount) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while verifying MFA TOTP.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to fetch MFA TOTP secret and timestamp',
				meta: { userId },
			}
		});
	}

	if (rows[0].totp_verified_at) {
		throw new AppError({
			status: 400,
			message: 'MFA TOTP is already verified.',
			errors: [{ info: MFA_TOTP_ALREADY_VERIFIED }],
			log: {
				level: 'debug',
				message: 'MFA TOTP is already verified',
				meta: { userId },
			}
		});
	}

	const secret = rows[0].totp_secret!;

	const totp = getTOTPForVerification(secret);

	if (totp.validate({ token: code, window: 1 }) === null) {
		throw new AppError({
			status: 403,
			message: 'Invalid code provided.',
			errors: [
				{
					info: INVALID_CODE,
					data: {
						location: 'body',
						path: 'code',
					},
				},
			],
			log: {
				level: 'debug',
				message: 'Invalid code provided for MFA TOTP verification',
				meta: { userId },
			}
		});
	}

	const { rowCount: rowCount2 } = await verifyTOTPMethod(userId);

	if (!rowCount2) {
		throw new AppError({
			status: 500,
			message: 'An unexpected error occured while verifying MFA TOTP.',
			errors: [{ info: INTERNAL_ERROR }],
			log: {
				level: 'error',
				message: 'Failed to update MFA TOTP status and timestamp',
				meta: { userId },
			}
		});
	}

	logger.debug('Successfully enabled MFA TOTP', { userId });

	return message('TOTP MFA successfully enabled.');
}

export async function sendEmailCode(req: Request): Promise<AsyncHandlerResult> {
	const userId = req.auth?.sub!;
	const code = generateCode(8);

	await db.withTransaction(async (client) => {

		const { rowCount, rows } = await setEmailCode(
			userId,
			code,
			client
		);

		if (!rowCount) {
			throw new AppError({
				status: 500,
				message: 'An unexpected error occured while creating MFA code.',
				errors: [{ info: INTERNAL_ERROR }],
				log: {
					level: 'error',
					message: 'User not found for MFA code update',
					meta: { userId },
				}
			});
		}

		const email = rows[0].email;

		await sendEmailMessage({
			to: email,
			subject: 'MFA Code',
			content: `Your MFA code: ${code}`,
		});

		logger.debug('MFA code successfully sent', {
			userId,
			email,
			code
		});

		return message('MFA code successfully send to users email.');
	});
}
