import { Router } from 'express';
import { Request } from 'express-jwt';
import logger from '../../logger';
import { CustomValidationError, message } from '../../utils/messageBuilder';
import {
	CODE_FORMAT_INVALID_EMAIL,
	CODE_FORMAT_INVALID_TOTP,
	CODE_LENGTH_MISMATCH,
	CODE_REQUIRED,
	MFA_FLOWS_NOT_FOUND,
	TYPE_REQUIRED,
	UNSUPPORTED_TYPE,
} from 'utils-node/errors';
import { body } from 'express-validator';
import {
	enableEmail,
	enableTOTP,
	disableTOTP,
	disableEmail,
	verifyTOTP,
	sendEmailCode,
} from '../../controllers/auth/mfaController';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	ISSUER,
	MFA_CHALLENGE_TOKEN_SECRET,
} from '../../../env-config';
import { getMFAStatus } from '../../repositories/auth/mfa';
import {
	MFATypes,
	sendCodeMFAMethod,
	verifyMFAMethod
} from '../../types/auth';
import { alphaNumericRegex, sixDigitCodeRegex } from '../../utils/regex';
import { codeSupportedMFABodyValidator, typeSupportedMFABodyValidator } from '../../utils/validators';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken,
	validateSignInConfirmOrAccessToken
} from '../../middlewares/jwtMiddleware';
import { validate } from '../../middlewares/validatorMiddleware';

const router = Router();

router.get(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;

		const { rowCount, rows } = await getMFAStatus(userId);

		if (!rowCount) {
			throw new AppError({
				status: 404,
				message: 'No MFA flows found for current user.',
				errors: [{ info: MFA_FLOWS_NOT_FOUND }],
				log: {
					level: 'error',
					message: 'MFA flows not found',
					meta: { userId }
				}
			});
		}

		const data = rows[0];

		logger.debug('MFA flows successfully retrieved', {
			userId,
			data,
		});

		return message('MFA flows successfully retrieved.', data);
	}),
);

router.post(
	'/enable',
	[
		typeSupportedMFABodyValidator(),
		body('code')
			.if((_, { req }) => {
				const type = req.body.type as MFATypes;

				return type === 'email';
			})
			.exists().withMessage(CODE_REQUIRED)
			.isLength({ min: 8, max: 8 }).withMessage(CODE_LENGTH_MISMATCH)
			.matches(alphaNumericRegex).withMessage(CODE_FORMAT_INVALID_EMAIL),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const type: MFATypes = req.body.type;

		switch (type) {
			case 'totp':
				return enableTOTP(req);
			case 'email':
				return enableEmail(req);
		}
	}),
);

router.post(
	'/disable',
	[
		typeSupportedMFABodyValidator(),
		codeSupportedMFABodyValidator(),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const type: MFATypes = req.body.type;

		switch (type) {
			case 'totp':
				return disableTOTP(req);
			case 'email':
				return disableEmail(req);
		}
	}),
);

router.post(
	'/verify',
	[
		body('type')
			.exists().withMessage(TYPE_REQUIRED)
			.isIn(verifyMFAMethod).withMessage(UNSUPPORTED_TYPE),
		body('code')
			.exists().withMessage(CODE_REQUIRED)
			.custom((value, { req }) => {
				const type = req.body.type as Extract<MFATypes, 'totp'>;

				if (!type || type.length === 0) return true;

				if (type === 'totp' && !sixDigitCodeRegex.test(value))
					throw new CustomValidationError(CODE_FORMAT_INVALID_TOTP);

				return true;
			}),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const type: Extract<MFATypes, 'totp'> = req.body.type;

		switch (type) {
			case 'totp':
				return verifyTOTP(req);
		}
	}),
);

router.post(
	'/send-code',
	[
		body('type')
			.exists().withMessage(TYPE_REQUIRED)
			.isIn(sendCodeMFAMethod).withMessage(UNSUPPORTED_TYPE),
		validate(logger),
		validateSignInConfirmOrAccessToken(
			ACCESS_TOKEN_SECRET,
			MFA_CHALLENGE_TOKEN_SECRET,
			AUDIENCE,
			ISSUER,
		),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const type: Extract<MFATypes, 'email'> = req.body.type;

		switch (type) {
			case 'email':
				return sendEmailCode(req);
		}
	}),
);

export default router;
