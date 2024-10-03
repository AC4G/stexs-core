import { Router, Response } from 'express';
import { Request } from 'express-jwt';
import db from '../database';
import logger from '../loggers/logger';
import {
	CustomValidationError,
	errorMessages,
} from 'utils-node/messageBuilder';
import {
	CODE_REQUIRED,
	INTERNAL_ERROR,
	INVALID_TYPE,
	TYPE_REQUIRED,
	UNSUPPORTED_TYPE,
} from 'utils-node/errors';
import { body } from 'express-validator';
import validate from 'utils-node/validatorMiddleware';
import {
	enableEmail,
	enableTOTP,
	disableTOTP,
	disableEmail,
	verifyTOTP,
	sendEmailCode,
} from '../controllers/mfaController';
import {
	validateAccessToken,
	validateSignInConfirmOrAccessToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/jwtMiddleware';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	ISSUER,
	SIGN_IN_CONFIRM_TOKEN_SECRET,
} from '../../env-config';

const router = Router();

router.get(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub;
		let flows;

		try {
			const { rowCount, rows } = await db.query(
				`
					SELECT 
						email, 
						CASE 
							WHEN totp_verified_at IS NOT NULL THEN TRUE 
						ELSE FALSE 
						END AS totp
					FROM auth.mfa
					WHERE user_id = $1::uuid;
        		`,
				[userId],
			);

			if (rowCount === 0) {
				logger.error(`MFA flows not found for user: ${userId}`);
				return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
			}

			flows = rows[0];
		} catch (e) {
			logger.error(
				`Error while fetching MFA flows for user: ${userId}. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		logger.debug(`MFA flows successfully retrieved for user: ${userId}`);

		res.json(flows);
	},
);

router.post(
	'/enable',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
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
		body('code').custom((value, { req }) => {
			if (req.body?.type !== 'email') {
				return true;
			}

			if (value === undefined || value.length === 0) {
				throw new CustomValidationError(CODE_REQUIRED);
			}

			return true;
		}),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { type } = req.body;

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
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
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
		body('code').notEmpty().withMessage(CODE_REQUIRED),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { type } = req.body;

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
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
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
		body('code').notEmpty().withMessage(CODE_REQUIRED),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { type } = req.body;

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
		validateSignInConfirmOrAccessToken(
			ACCESS_TOKEN_SECRET,
			SIGN_IN_CONFIRM_TOKEN_SECRET,
			AUDIENCE,
			ISSUER,
		),
		transformJwtErrorMessages(logger),
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
	],
	async (req: Request, res: Response) => {
		const { type } = req.body;

		switch (type) {
			case 'email':
				sendEmailCode(req, res);
				break;
		}
	},
);

export default router;
