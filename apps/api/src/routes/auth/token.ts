import { Router, Response } from 'express';
import { CustomValidationError } from 'utils-node/messageBuilder';
import { Request } from 'express-jwt';
import {
	CLIENT_ID_REQUIRED,
	CLIENT_SECRET_REQUIRED,
	CODE_REQUIRED,
	FIELD_MUST_BE_A_STRING,
	GRANT_TYPE_REQUIRED,
	IDENTIFIER_REQUIRED,
	INVALID_GRANT_TYPE,
	INVALID_TOKEN,
	INVALID_TYPE,
	INVALID_UUID,
	PASSWORD_REQUIRED,
	REFRESH_TOKEN_REQUIRED,
	TOKEN_REQUIRED,
	TYPE_REQUIRED,
} from 'utils-node/errors';
import { verify, decode } from 'jsonwebtoken';
import logger from '../../logger';
import { body, query } from 'express-validator';
import { validate } from 'utils-node/middlewares';
import { AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from '../../../env-config';
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
} from '../../types/auth';
import { decodeRefreshToken, requireUUIDv4 } from '../../services/validators';

const router = Router();

router.post(
	'/',
	[
		query('grant_type')
			.notEmpty().withMessage(GRANT_TYPE_REQUIRED)
			.bail()
			.custom((value) => {
				if (!possibleGrantTypes.includes(value as GrantTypes)) {
					throw new CustomValidationError({
						code: INVALID_GRANT_TYPE.code,
						message: INVALID_GRANT_TYPE.messages[1],
					});
				}

				return true;
			}),
		body('client_id')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type as GrantTypes | undefined;
				return grantType && grantTypesRequiringClientCreds.includes(grantType);
			})
			.notEmpty().withMessage(CLIENT_ID_REQUIRED)
			.bail()
			.custom(requireUUIDv4),
		body('client_secret')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type as GrantTypes | undefined;
				return grantType && grantTypesRequiringClientCreds.includes(grantType);
			})
			.notEmpty().withMessage(CLIENT_SECRET_REQUIRED),
		body('code')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type as GrantTypes | undefined;
				return grantType && grantTypesRequiringCode.includes(grantType);
			})
			.notEmpty().withMessage(CODE_REQUIRED),
		body('refresh_token')
			.if((_, { req }) => req.query?.grant_type === 'refresh_token')
			.notEmpty().withMessage(REFRESH_TOKEN_REQUIRED)
			.bail()
			.custom(async (value, { req }) => {
				await decodeRefreshToken(value, req);
				return true;
			}),
		body('identifier')
			.if((_, { req }) => req.query?.grant_type === 'password')
			.notEmpty()
			.withMessage(IDENTIFIER_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		body('password')
			.if((_, { req }) => req.query?.grant_type === 'password')
			.notEmpty()
			.withMessage(PASSWORD_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
		body('type')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type as GrantTypes | undefined;
				return grantType && grantTypesForMFA.includes(grantType);
			})
			.notEmpty().withMessage(TYPE_REQUIRED)
			.bail()
			.custom((value) => {
				if (!supportedMFATypes.includes(value)) {
					throw new CustomValidationError(INVALID_TYPE);
				}
				
				return true;
			}),
		body('token')
			.if((_, { req }) => {
				const grantType = req.query?.grant_type as GrantTypes | undefined;
				return grantType && grantTypesForMFA.includes(grantType);
			})
			.notEmpty().withMessage(TOKEN_REQUIRED)
			.bail()
			.isString()
			.withMessage(FIELD_MUST_BE_A_STRING),
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
