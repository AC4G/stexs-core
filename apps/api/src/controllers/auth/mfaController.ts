import { Response } from 'express';
import { Request } from 'express-jwt';
import db from '../../db';
import logger from '../../loggers/logger';
import { message } from 'utils-node/messageBuilder';
import {
	CODE_EXPIRED,
	INTERNAL_ERROR,
	INVALID_CODE,
	MFA_CANNOT_BE_COMPLETELY_DISABLED,
	MFA_EMAIL_ALREADY_DISABLED,
	MFA_EMAIL_ALREADY_ENABLED,
	TOTP_ALREADY_DISABLED,
	TOTP_ALREADY_ENABLED,
	TOTP_ALREADY_VERIFIED,
} from 'utils-node/errors';
import {
	getTOTPForSettup,
	getTOTPForVerification,
} from '../../services/totpService';
import { generateCode, isExpired } from 'utils-node';
import sendEmail from '../../services/emailService';

export async function enableTOTP(req: Request, res: Response) {
	const userId = req.auth?.sub!;
	
	let email: string;

	try {
		const { rowCount, rows } = await db.query<{
			totp_verified_at: string | null;
			email: string;
		}>(
			`
				SELECT 
					t.totp_verified_at,
					u.email
				FROM auth.mfa AS t 
				INNER JOIN auth.users AS u ON t.user_id = u.id
				WHERE t.user_id = $1::uuid;
			`,
			[userId],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(`MFA TOTP status not found for user: ${userId}`);
			return res
				.status(404)
				.json(
					message(
						'An unexpected error occured while checking MFA status.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		if (rows[0].totp_verified_at) {
			logger.debug(`MFA TOTP is already enabled for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'MFA TOTP is already enabled.',
						{},
						[{ info: TOTP_ALREADY_ENABLED }]
					)
				);
		}

		email = rows[0].email;
	} catch (e) {
		logger.error(
			`Error while fetching MFA TOTP status for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while checking MFA TOTP status.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	const totp = getTOTPForSettup(email);
	const secret = totp.secret.base32;

	try {
		const { rowCount } = await db.query(
			`
				UPDATE auth.mfa
				SET
					totp_secret = $2::text
				WHERE user_id = $1::uuid;
			`,
			[userId, secret],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(`Failed to set MFA TOTP secret for user: ${userId}`);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while setting MFA TOTP secret.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	} catch (e) {
		logger.error(
			`Error while updating MFA TOTP secret for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while setting MFA TOTP secret.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	res.json(message('MFA TOTP successfully enabled.', {
		secret,
		otp_auth_uri: totp.toString(),
	}));
}

export async function enableEmail(req: Request, res: Response) {
	const userId = req.auth?.sub!;
	const {
		code
	}: {
		code: string
	} = req.body;

	try {
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
				`Failed to fetch MFA email code and timestamp for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while checking MFA email status.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		if (rows[0].email) {
			logger.debug(`MFA email is already enabled for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'MFA email is already enabled.',
						{},
						[{ info: MFA_EMAIL_ALREADY_ENABLED }]
					)
				);
		}

		if (code !== rows[0].email_code) {
			logger.debug(`Invalid MFA activation code provided for user: ${userId}`);
			return res
				.status(403)
				.json(
					message(
						'Invalid MFA activation code provided.',
						{},
						[
							{
								info: INVALID_CODE,
								data: {
									location: 'body',
									path: 'code',
								},
							},
						]
					)
				);
		}

		const emailCodeSentAt = rows[0].email_code_sent_at;

		if (!emailCodeSentAt || isExpired(emailCodeSentAt, 5)) {
			logger.debug(`MFA activation code expired for user: ${userId}`);
			return res
				.status(403)
				.json(
					message(
						'MFA activation code expired.',
						{},
						[
							{
								info: CODE_EXPIRED,
								data: {
									location: 'body',
									path: 'code',
								},
							},
						]
					)
				);
		}

		const { rowCount: count } = await db.query(
			`
				UPDATE auth.mfa
				SET
					email = TRUE,
					email_code = NULL,
					email_code_sent_at = NULL
				WHERE user_id = $1::uuid;
			`,
			[userId],
		);

		if (!count || count === 0) {
			logger.error(
				`Failed to update MFA email status, code and timestamp for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while enabling MFA email.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	} catch (e) {
		logger.error(
			`Error during MFA email activation for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while enabling MFA email.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	logger.debug(`Successfully enabled MFA email for user: ${userId}`);

	res.json(message('Email MFA successfully enabled.'));
}

export async function disableTOTP(req: Request, res: Response) {
	const userId = req.auth?.sub!;
	const {
		code
	}: {
		code: string
	} = req.body;

	let secret: string;

	try {
		const { rowCount, rows } = await db.query<{
			totp_verified_at: string | null;
			email: boolean;
			totp_secret: string | null;
		}>(
			`
				SELECT 
					totp_verified_at, 
					email, 
					totp_secret
				FROM auth.mfa
				WHERE user_id = $1::uuid;
			`,
			[userId],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(
				`Failed to fetch MFA TOTP status and secret for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while checking MFA status.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		if (!rows[0].totp_verified_at) {
			logger.debug(`MFA TOTP is already disabled for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'MFA TOTP is already disabled.',
						{},
						[{ info: TOTP_ALREADY_DISABLED }]
					)
				);
		}

		if (!rows[0].email) {
			logger.debug(`MFA totp cant be disabled because this is the last active MFA method for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'MFA TOTP cant be disabled because this is the last active MFA method.',
						{},
						[{ info: MFA_CANNOT_BE_COMPLETELY_DISABLED }]
					)
				);
		}

		secret = rows[0].totp_secret!;
	} catch (e) {
		logger.error(
			`Error while fetching MFA TOTP status and secret for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while checking MFA status.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	const totp = getTOTPForVerification(secret);

	if (totp.validate({ token: code, window: 1 }) === null) {
		logger.debug(`Invalid code provided for MFA TOTP for user: ${userId}`);
		return res
			.status(403)
			.json(
				message(
					'Invalid code provided.',
					{},
					[
						{
							info: INVALID_CODE,
							data: {
								location: 'body',
								path: 'code',
							},
						},
					]
				)
			);
	}

	try {
		const { rowCount } = await db.query(
			`
				UPDATE auth.mfa
				SET
					totp_secret = NULL,
					totp_verified_at = NULL
				WHERE user_id = $1::uuid;
			`,
			[userId],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(
				`Failed to update MFA TOTP status, secret and timestamp for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while disabling MFA TOTP.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	} catch (e) {
		logger.error(
			`Error while updating MFA TOTP status, secret and timestamp for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while disabling MFA TOTP.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	logger.debug(`Successfully disabled MFA TOTP for user: ${userId}`);

	res.json(message('TOTP MFA successfully disabled.'));
}

export async function disableEmail(req: Request, res: Response) {
	const userId = req.auth?.sub!;
	const {
		code
	}: {
		code: string
	} = req.body;

	try {
		const { rowCount, rows } = await db.query<{
			email: boolean;
			totp_verified_at: string | null;
			email_code: string | null;
			email_code_sent_at: string | null;
		}>(
			`
				SELECT 
					email, 
					totp_verified_at, 
					email_code, 
					email_code_sent_at
				FROM auth.mfa
				WHERE user_id = $1::uuid;
			`,
			[userId],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(
				`Failed to fetch MFA email code and timestamp for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while checking MFA status.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		if (!rows[0].email) {
			logger.debug(`MFA email is already disabled for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'MFA email is already disabled.',
						{},
						[{ info: MFA_EMAIL_ALREADY_DISABLED }]
					)
				);
		}

		if (!rows[0].totp_verified_at) {
			logger.debug(`MFA email cant be disabled because this is the last active MFA method for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'MFA email cant be disabled because this is the last active MFA method.',
						{},
						[{ info: MFA_CANNOT_BE_COMPLETELY_DISABLED }]
					)
				);
		}

		if (code !== rows[0].email_code) {
			logger.debug(`Invalid MFA code provided for user: ${userId}`);
			return res
				.status(403)
				.json(
					message(
						'Invalid code provided.',
						{},
						[
							{
								info: INVALID_CODE,
								data: {
									location: 'body',
									path: 'code',
								},
							},
						]
					)
				);
		}

		const emailCodeSentAt = rows[0].email_code_sent_at;

		if (!emailCodeSentAt || isExpired(emailCodeSentAt, 5)) {
			logger.debug(`MFA code expired for user: ${userId}`);
			return res
				.status(403)
				.json(
					message(
						'Provided code expired.',
						{},
						[
							{
								info: CODE_EXPIRED,
								data: {
									location: 'body',
									path: 'code',
								},
							},
						]
					)
				);
		}

		const { rowCount: count } = await db.query(
			`
				UPDATE auth.mfa
				SET
					email = FALSE,
					email_code = NULL,
					email_code_sent_at = NULL
				WHERE user_id = $1::uuid;
			`,
			[userId],
		);

		if (!count || count === 0) {
			logger.error(
				`Failed to update MFA email status, code and timestamp for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while disabling MFA email.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	} catch (e) {
		logger.error(
			`Error during MFA email confirmation for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while disabling MFA email.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	logger.debug(`Successfully disabled MFA email for user: ${userId}`);

	res.json(message('Email MFA successfully disabled.'));
}

export async function verifyTOTP(req: Request, res: Response) {
	const userId = req.auth?.sub;
	const { code } = req.body;

	let secret: string;

	try {
		const { rowCount, rows } = await db.query<{
			totp_secret: string | null;
			totp_verified_at: string | null;
		}>(
			`
				SELECT 
					totp_secret, 
					totp_verified_at
				FROM auth.mfa
				WHERE user_id = $1::uuid;
			`,
			[userId],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(
				`Failed to fetch MFA TOTP secret and timestamp for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while verifying MFA TOTP.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		if (rows[0].totp_verified_at) {
			logger.debug(`MFA TOTP is already verified for user: ${userId}`);
			return res
				.status(400)
				.json(
					message(
						'MFA TOTP is already verified.',
						{},
						[{ info: TOTP_ALREADY_VERIFIED }]
					)
				);
		}

		secret = rows[0].totp_secret!;
	} catch (e) {
		logger.error(
			`Error while fetching MFA TOTP secret and timestamp for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while verifying MFA TOTP.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	const totp = getTOTPForVerification(secret);

	if (totp.validate({ token: code, window: 1 }) === null) {
		logger.debug(`Invalid code provided for MFA TOTP verification for user: ${userId}`);
		return res
			.status(403)
			.json(
				message(
					'Invalid code provided.',
					{},
					[
						{
							info: INVALID_CODE,
							data: {
								location: 'body',
								path: 'code',
							},
						},
					]
				)
			);
	}

	try {
		const { rowCount } = await db.query(
			`
				UPDATE auth.mfa
				SET
					totp_verified_at = CURRENT_TIMESTAMP
				WHERE user_id = $1::uuid;
			`,
			[userId],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(
				`Failed to update MFA TOTP status and timestamp for user: ${userId}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while verifying MFA TOTP.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	} catch (e) {
		logger.error(
			`Error while updating MFA TOTP status and timestamp for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while verifying MFA TOTP.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	logger.debug(`Successfully enabled MFA TOTP for user: ${userId}`);

	res.json(message('TOTP MFA successfully enabled.'));
}

export async function sendEmailCode(req: Request, res: Response) {
	const userId = req.auth?.sub!;
	const code = generateCode(8);

	let email: string;

	try {
		const { rowCount, rows } = await db.query<{
			email: string;
		}>(
			`
				WITH updated_mfa AS (
					UPDATE auth.mfa
					SET
						email_code = $1::text,
						email_code_sent_at = CURRENT_TIMESTAMP
					WHERE user_id = $2::uuid
					RETURNING user_id
				)
				SELECT u.email
				FROM auth.users u
				WHERE u.id = $2::uuid;
			`,
			[code, userId],
		);

		if (!rowCount || rowCount === 0) {
			logger.error(`User not found for MFA code update for user: ${userId}`);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occured while creating MFA code.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		email = rows[0].email;
	} catch (e) {
		logger.error(
			`Error while updating and fetching MFA code for user: ${userId}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occured while creating MFA code.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	try {
		await sendEmail(
			email,
			`MFA code ${code}`,
			undefined,
			`Your MFA code: ${code}`,
		);
	} catch (e) {
		logger.error(
			`Error while sending MFA code to ${email}. Error: ${
				e instanceof Error ? e.message : e
			}`,
		);
		return res
			.status(500)
			.json(
				message(
					'An unexpected error occurred while sending MFA code.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
	}

	logger.debug(`MFA code successfully sent to email: ${email}`);

	res.json(message('MFA code successfully send to users email.'));
}
