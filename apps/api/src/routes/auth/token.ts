import { Router, Response } from 'express';
import { CustomValidationError } from 'utils-node/messageBuilder';
import { Request } from 'express-jwt';
import {
	CLIENT_ID_REQUIRED,
	CLIENT_SECRET_REQUIRED,
	CODE_FORMAT_INVALID_EMAIL,
	CODE_FORMAT_INVALID_TOTP,
	CODE_REQUIRED,
	FIELD_MUST_BE_A_STRING,
	GRANT_TYPE_REQUIRED,
	IDENTIFIER_REQUIRED,
	INVALID_GRANT_TYPE,
	INVALID_TYPE,
	INVALID_UUID,
	PASSWORD_REQUIRED,
	REFRESH_TOKEN_REQUIRED,
	TOKEN_REQUIRED,
	TYPE_REQUIRED,
} from 'utils-node/errors';
import logger from '../../logger';
import { body, cookie, query } from 'express-validator';
import { validate } from 'utils-node/middlewares';
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
import { decodeMFAChallengeToken, decodeRefreshToken } from '../../utils/validators';
import { isGrantType } from '../../utils/grantType';
import { validateUUIDV4 } from '../../utils/uuid';
import { eightAlphaNumericRegex, sixDigitCodeRegex } from '../../utils/regex';

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
		body('client_id')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesRequiringClientCreds.includes(grantType as typeof grantTypesRequiringClientCreds[number]);
			})
			.exists().withMessage(CLIENT_ID_REQUIRED)
			.isUUID('4').withMessage(INVALID_UUID),
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
		body('password')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesForPassword.includes(grantType as typeof grantTypesForPassword[number]);
			})
			.exists().withMessage(PASSWORD_REQUIRED)
			.isString().withMessage(FIELD_MUST_BE_A_STRING),
		body('type')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type;

				if (!isGrantType(grantType)) return false;

				return grantTypesForMFA.includes(grantType as typeof grantTypesForMFA[number]);
			})
			.exists().withMessage(TYPE_REQUIRED)
			.isIn(supportedMFATypes).withMessage(INVALID_TYPE),
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

				const type = req.body.type as MFATypes | undefined;

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
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const grantType = req.query.grant_type as GrantTypes;

		logger.debug(`Token Endpoint accessed with grant type: ${grantType}`);

		switch (grantType) {
			case 'mfa_challenge':
				mfaChallengeController(req, res);
				break;
			case 'password':
				passwordController(req, res);
				break;
			case 'client_credentials':
				clientCredentialsController(req, res);
				break;
			case 'authorization_code':
				authorizationCodeController(req, res);
				break;
			case 'refresh_token':
				refreshTokenController(req, res);
				break;
		}
	},
);

export default router;
