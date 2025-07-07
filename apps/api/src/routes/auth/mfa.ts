import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import logger from '../../logger';
import { CustomValidationError, message } from 'utils-node/messageBuilder';
import {
	CODE_FORMAT_INVALID_EMAIL,
	CODE_FORMAT_INVALID_TOTP,
	CODE_LENGTH_MISMATCH,
	CODE_REQUIRED,
	INTERNAL_ERROR,
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
	validate,
	validateAccessToken,
	validateSignInConfirmOrAccessToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/middlewares';
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
	supportedMFAMethods,
	verifyMFAMethod
} from '../../types/auth';
import {
	alphaNumericRegex,
	eightAlphaNumericRegex,
	sixDigitCodeRegex
} from '../../utils/regex';

const router = Router();

router.get(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;

		try {
			const { rowCount, rows } = await getMFAStatus(userId);

			if (!rowCount || rowCount === 0) {
				logger.error(`MFA flows not found for user: ${userId}`);
				return res
					.status(404)
					.json(
						message(
							'No MFA flows found for current user.',
							{},
							[{ info: MFA_FLOWS_NOT_FOUND }]
						)
					);
			}

			logger.debug(`MFA flows successfully retrieved for user: ${userId}`);

			res.json(message('MFA flows successfully retrieved.', rows[0]));
		} catch (e) {
			logger.error(
				`Error while fetching MFA flows for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(
				message(
					'An unexpected error occured while retrieving MFA flows.',
					{},
					[{ info: INTERNAL_ERROR }]
				)
			);
		}
	},
);

router.post(
	'/enable',
	[
		body('type')
			.exists().withMessage(TYPE_REQUIRED)
			.isIn(supportedMFAMethods).withMessage(UNSUPPORTED_TYPE),
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
	async (req: Request, res: Response) => {
		const {
			type
		}: {
			type: MFATypes;
		} = req.body;

		switch (type) {
			case 'totp':
				enableTOTP(req, res);
				break;
			case 'email':
				enableEmail(req, res);
		}
	},
);

router.post(
	'/disable',
	[
		body('type')
			.exists().withMessage(TYPE_REQUIRED)
			.isIn(supportedMFAMethods).withMessage(UNSUPPORTED_TYPE),
		body('code')
			.exists().withMessage(CODE_REQUIRED)
			.custom((value, { req }) => {
				const type = req.body.type as MFATypes;

				if (!type || type.length === 0) return true;

				if (type === 'totp' && !sixDigitCodeRegex.test(value))
					throw new CustomValidationError(CODE_FORMAT_INVALID_TOTP);

				if (type === 'email' && !eightAlphaNumericRegex.test(value))
					throw new CustomValidationError(CODE_FORMAT_INVALID_EMAIL);

				return true;
			}),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const {
			type
		}: {
			type: MFATypes;
		} = req.body;

		switch (type) {
			case 'totp':
				disableTOTP(req, res);
				break;
			case 'email':
				disableEmail(req, res);
				break;
		}
	},
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
	async (req: Request, res: Response) => {
		const {
			type
		}: {
			type: Extract<MFATypes, 'totp'>;
		} = req.body;

		switch (type) {
			case 'totp':
				verifyTOTP(req, res);
				break;
		}
	},
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
	async (req: Request, res: Response) => {
		const {
			type
		}: {
			type: Extract<MFATypes, 'email'>;
		} = req.body;

		switch (type) {
			case 'email':
				sendEmailCode(req, res);
				break;
		}
	},
);

export default router;
