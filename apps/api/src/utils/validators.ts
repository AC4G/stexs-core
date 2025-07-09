import { CustomValidationError } from "utils-node/messageBuilder";
import {
  GrantTypes,
  grantTypesInRefreshToken,
  MFATypes,
  possibleGrantTypes,
  supportedMFAMethods
} from "../types/auth";
import {
  CLIENT_ID_REQUIRED,
  CODE_FORMAT_INVALID_EMAIL,
  CODE_FORMAT_INVALID_TOTP,
  CODE_REQUIRED,
  EMAIL_REQUIRED,
  INVALID_EMAIL,
  INVALID_GRANT_TYPE,
  INVALID_MFA_CHALLENGE_TOKEN,
  INVALID_PASSWORD,
  INVALID_PASSWORD_LENGTH,
  INVALID_REFRESH_TOKEN, 
  INVALID_UUID, 
  ITEM_ID_NOT_NUMERIC, 
  ITEM_ID_REQUIRED, 
  ORGANIZATION_ID_NOT_NUMERIC, 
  ORGANIZATION_ID_REQUIRED, 
  PASSWORD_REQUIRED, 
  PROJECT_ID_NOT_NUMERIC, 
  PROJECT_ID_REQUIRED, 
  TYPE_REQUIRED,
  UNSUPPORTED_TYPE
} from "utils-node/errors";
import { decode, verify } from "jsonwebtoken";
import {
  AUDIENCE,
  ISSUER,
  MFA_CHALLENGE_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET
} from "../../env-config";
import { body, Meta, param } from "express-validator";
import {
  eightAlphaNumericRegex,
  passwordRegex,
  sixDigitCodeRegex
} from "./regex";

export const isGrantType = (value: any): boolean =>
  possibleGrantTypes.includes(value);

export const decodeRefreshToken = async (token: string, req: any) => {
  const decoded = decode(token, { json: true }) as { grant_type?: GrantTypes };

  if (!decoded?.grant_type || !grantTypesInRefreshToken.includes(decoded.grant_type as typeof grantTypesInRefreshToken[number])) {
    throw new CustomValidationError({
      code: INVALID_GRANT_TYPE.code,
      message: INVALID_GRANT_TYPE.messages[0],
    });
  }

  await new Promise<void>((resolve, reject) => {
    verify(token, REFRESH_TOKEN_SECRET, {
      audience: AUDIENCE,
      issuer: ISSUER,
      algorithms: ['HS256'],
    }, (err, verified) => {
      if (err) return reject(new CustomValidationError(INVALID_REFRESH_TOKEN));

      if (verified && typeof verified === 'object') {
        if (!grantTypesInRefreshToken.includes(verified.grant_type)) {
          return reject(new CustomValidationError({
            code: INVALID_GRANT_TYPE.code,
            message: INVALID_GRANT_TYPE.messages[0],
          }));
        }

        req.auth = verified;
        resolve();
      }
    });
  });
};

export const decodeMFAChallengeToken = async (token: string, req: any) => {
  await new Promise<void>((resolve, reject) => {
    verify(token, MFA_CHALLENGE_TOKEN_SECRET, {
      audience: AUDIENCE,
      issuer: ISSUER,
      algorithms: ['HS256'],
    }, (err, verified) => {
      if (err) return reject(new CustomValidationError(INVALID_MFA_CHALLENGE_TOKEN));

      if (verified && typeof verified === 'object') {
        if (verified.grant_type !== 'mfa_challenge') {
          return reject(new CustomValidationError({
            code: INVALID_GRANT_TYPE.code,
            message: INVALID_GRANT_TYPE.messages[0],
          }));
        }
      }

      req.auth = verified;
      resolve();
    });
  })
}

export const typeSupportedMFABodyValidator = (
  ifCondition?: (value: any, meta: Meta) => boolean
) => {
  let validator = body('type');

  if (ifCondition) {
    validator = validator.if(ifCondition);
  }

  return validator
    .exists().withMessage(TYPE_REQUIRED)
    .isIn(supportedMFAMethods).withMessage(UNSUPPORTED_TYPE);
};

export const passwordBodyValidator = (
  ifCondition?: (value: any, meta: Meta) => boolean
) => {
  let validator = body('password');

  if (ifCondition) {
    validator = validator.if(ifCondition);
  }

  return validator
    .exists().withMessage(PASSWORD_REQUIRED)
    .matches(passwordRegex).withMessage(INVALID_PASSWORD)
    .isLength({ min: 10, max: 72 }).withMessage(INVALID_PASSWORD_LENGTH);
};

export const emailBodyValidator = () => {
  return body('email')
    .exists().withMessage(EMAIL_REQUIRED)
    .isEmail().withMessage({
      code: INVALID_EMAIL.code,
      message: INVALID_EMAIL.messages[0],
    });
};

export const clientIdBodyValidator = (
  ifCondition?: (value: any, meta: Meta) => boolean
) => {
  let validator = body('client_id');

  if (ifCondition) {
    validator = validator.if(ifCondition);
  }

  return validator
    .exists().withMessage(CLIENT_ID_REQUIRED)
    .isUUID('4').withMessage(INVALID_UUID);
};

export const codeSupportedMFABodyValidator = (
  ifCondition?: (value: any, meta: Meta) => boolean
) => {
  let validator = body('code');

  if (ifCondition) {
    validator = validator.if(ifCondition);
  }

  return validator
    .exists().withMessage(CODE_REQUIRED)
    .custom((value, { req }) => {
      const type = req.body.type as MFATypes;

      if (!type || type.length === 0) return true;

      if (type === 'totp' && !sixDigitCodeRegex.test(value))
        throw new CustomValidationError(CODE_FORMAT_INVALID_TOTP);

      if (type === 'email' && !eightAlphaNumericRegex.test(value))
        throw new CustomValidationError(CODE_FORMAT_INVALID_EMAIL);

      return true;
    });
};

export const itemIdQueryValidator = param('itemId')
  .exists().withMessage(ITEM_ID_REQUIRED)
  .isNumeric().withMessage(ITEM_ID_NOT_NUMERIC);

export const organizationIdQueryValidator = param('organizationId')
  .exists().withMessage(ORGANIZATION_ID_REQUIRED)
  .isNumeric().withMessage(ORGANIZATION_ID_NOT_NUMERIC);

export const projectIdQueryValidator = param('projectId')
  .exists().withMessage(PROJECT_ID_REQUIRED)
  .isNumeric().withMessage(PROJECT_ID_NOT_NUMERIC);
