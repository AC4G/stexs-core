import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import logger from '../../logger';
import {
	CustomValidationError,
	message,
} from 'utils-node/messageBuilder';
import {
	CODE_REQUIRED,
	FIELD_MUST_BE_A_STRING,
	INTERNAL_ERROR,
	INVALID_TYPE,
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
	SIGN_IN_CONFIRM_TOKEN_SECRET,
} from '../../../env-config';
import { getMFAStatus } from '../../repositories/auth/mfa';

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
			.notEmpty()
			.withMessage(TYPE_REQUIRED)
			.bail()
			.custom((value) => {
				const supportedTypes = ['email', 'totp'];

				if (!supportedTypes.includes(value)) {
					throw new CustomValidationError(UNSUPPORTED_TYPE);
				}

				return true;
			}),
		body('code')
			.custom((value, { req }) => {
				if (req.body?.type !== 'email') {
					return true;
				}

				if (value === undefined || value.length === 0) {
					throw new CustomValidationError(CODE_REQUIRED);
				}

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
			type: 'email' | 'totp';
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
			.notEmpty()
			.withMessage(TYPE_REQUIRED)
			.bail()
			.custom((value) => {
				const supportedTypes = ['email', 'totp'];

				if (!supportedTypes.includes(value)) {
					throw new CustomValidationError(UNSUPPORTED_TYPE);
				}

				return true;
			}),
		body('code')
			.notEmpty()
			.withMessage(CODE_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const {
			type
		}: {
			type: 'email' | 'totp';
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
			.notEmpty()
			.withMessage(TYPE_REQUIRED)
			.bail()
			.custom((value) => {
				const supportedTypes = ['totp'];

				if (!supportedTypes.includes(value))
					throw new CustomValidationError(INVALID_TYPE);

				return true;
			}),
		body('code')
			.notEmpty()
			.withMessage(CODE_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const {
			type
		}: {
			type: 'totp';
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
			.notEmpty()
			.withMessage(TYPE_REQUIRED)
			.bail()
			.custom((value) => {
				const supportedTypes = ['email'];

				if (!supportedTypes.includes(value)) {
					throw new CustomValidationError(UNSUPPORTED_TYPE);
				}

				return true;
			}),
		validate(logger),
		validateSignInConfirmOrAccessToken(
			ACCESS_TOKEN_SECRET,
			SIGN_IN_CONFIRM_TOKEN_SECRET,
			AUDIENCE,
			ISSUER,
		),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const {
			type
		}: {
			type: 'email';
		} = req.body;

		switch (type) {
			case 'email':
				sendEmailCode(req, res);
				break;
		}
	},
);

export default router;
