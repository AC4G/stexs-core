import { Router, Response, NextFunction } from 'express';
import { CustomValidationError } from '../../utils/messageBuilder';
import { Request } from 'express-jwt';
import {
	CLIENT_SECRET_REQUIRED,
	CODE_FORMAT_INVALID_EMAIL,
	CODE_FORMAT_INVALID_TOTP,
	CODE_REQUIRED,
	FIELD_MUST_BE_A_STRING,
	GRANT_TYPE_REQUIRED,
	IDENTIFIER_REQUIRED,
	INVALID_GRANT_TYPE,
	INVALID_UUID,
	REFRESH_TOKEN_REQUIRED,
	TOKEN_REQUIRED,
} from 'utils-node/errors';
import { body, cookie, query } from 'express-validator';
import {
	authorizationCodeController,
	clientCredentialsController,
	mfaChallengeController,
	passwordController,
	refreshTokenController
} from '../../controllers/auth/tokenController';
import {
  possibleGrantTypes,
  GrantTypes,
  grantTypesRequiringClientCreds,
  grantTypesRequiringCode,
  grantTypesForPassword,
  grantTypesForMFA,
  supportedMFATypes,
  grantTypesRequiringRefreshToken,
  MFATypes,
} from '../../types/auth';
import { isGrantType } from '../../utils/grantType';
import { validateUUIDV4 } from '../../utils/uuid';
import { eightAlphaNumericRegex, sixDigitCodeRegex } from '../../utils/regex';
import { mfaValidationMiddleware } from '../../utils/mfa';
import asyncHandler from '../../utils/asyncHandler';
import {
	validate,
	clientIdBodyValidator,
	decodeMFAChallengeToken,
	decodeRefreshToken,
	passwordBodyValidator,
	typeSupportedMFABodyValidator
} from '../../middlewares/validatorMiddleware';

const router = Router();

router.post(
	'/',
	[
		query('grant_type')
			.exists().withMessage(GRANT_TYPE_REQUIRED)
			.isIn(possibleGrantTypes).withMessage({
				code: INVALID_GRANT_TYPE.code,
				message: INVALID_GRANT_TYPE.messages[1],
			}),
		clientIdBodyValidator((_, { req }) => {
			const grantType = req.query?.grant_type;

			if (!isGrantType(grantType)) return false;

			return grantTypesRequiringClientCreds.includes(grantType as typeof grantTypesRequiringClientCreds[number]);
		}),
		body('client_secret')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesRequiringClientCreds.includes(grantType as typeof grantTypesRequiringClientCreds[number]);
			})
			.exists().withMessage(CLIENT_SECRET_REQUIRED)
			.escape(),
		cookie('refresh_token')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesRequiringRefreshToken.includes(grantType as typeof grantTypesRequiringRefreshToken[number]);
			})
			.exists().withMessage(REFRESH_TOKEN_REQUIRED)
			.bail()
			.custom(async (value, { req }) => {
				await decodeRefreshToken(value, req);
				return true;
			}),
		body('identifier')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesForPassword.includes(grantType as typeof grantTypesForPassword[number]);
			})
			.exists().withMessage(IDENTIFIER_REQUIRED)
			.isString().withMessage(FIELD_MUST_BE_A_STRING)
			.escape(),
		passwordBodyValidator((_, { req }) => {
			const grantType = req.query?.grant_type;

			if (!isGrantType(grantType)) return false;

			return grantTypesForPassword.includes(grantType as typeof grantTypesForPassword[number]);
		}),
		typeSupportedMFABodyValidator((_, { req }) => {
			const grantType = req.query?.grant_type;

			if (!isGrantType(grantType)) return false;

			return grantTypesForMFA.includes(grantType as typeof grantTypesForMFA[number]);
		}),
		body('code')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesRequiringCode.includes(grantType as typeof grantTypesRequiringCode[number]);
			})
			.exists().withMessage(CODE_REQUIRED)
			.custom((value, { req }) => {
				const grantType = req.query?.grant_type as typeof grantTypesRequiringCode[number];

				if (grantType === 'authorization_code' && !validateUUIDV4(value))
					throw new CustomValidationError(INVALID_UUID);

				const type = req.body?.type as MFATypes | undefined;

				if (!type || type.length === 0) return true;

				if (!supportedMFATypes.includes(type)) return true;

				if (grantType === 'mfa_challenge'
					&& type === 'totp'
					&& !sixDigitCodeRegex.test(value)
				)
					throw new CustomValidationError(CODE_FORMAT_INVALID_TOTP);

				if (grantType === 'mfa_challenge'
					&& type === 'email'
					&& !eightAlphaNumericRegex.test(value)
				)
					throw new CustomValidationError(CODE_FORMAT_INVALID_EMAIL);

				return true;
			}),
		body('token')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesForMFA.includes(grantType as typeof grantTypesForMFA[number]);
			})
			.exists().withMessage(TOKEN_REQUIRED)
			.bail()
			.custom(async (value, { req }) => {
				await decodeMFAChallengeToken(value, req);
				return true;
			}),
		validate(),
		(req: Request, res: Response, next: NextFunction) => {
			const grantType = req.query?.grant_type;

			if (!isGrantType(grantType)) return next();

			if (!grantTypesForMFA.includes(grantType as typeof grantTypesForMFA[number])) return next();

			const type = req.body?.type as MFATypes | undefined;

			if (!type || type.length === 0) return true;

			if (!supportedMFATypes.includes(type)) return true;

			const code = req.body?.code as string | undefined;

			if (!code || code.length === 0) return next();

			if (type === 'totp' && !sixDigitCodeRegex.test(code)) return next();

			if (type === 'email' && !eightAlphaNumericRegex.test(code)) return next();

			return mfaValidationMiddleware()(req, res, next);
		},
	],
	asyncHandler(async (req: Request) => {
		const grantType = req.query.grant_type as GrantTypes;

		switch (grantType) {
			case 'mfa_challenge':
				return mfaChallengeController(req);
			case 'password':
				return passwordController(req);
			case 'client_credentials':
				return clientCredentialsController(req);
			case 'authorization_code':
				return authorizationCodeController(req);
			case 'refresh_token':
				return refreshTokenController(req);
		}
	}),
);

export default router;
