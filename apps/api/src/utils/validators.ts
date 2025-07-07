import { CustomValidationError } from "utils-node/messageBuilder";
import {
  GrantTypes,
  grantTypesInRefreshToken,
  possibleGrantTypes
} from "../types/auth";
import { INVALID_GRANT_TYPE,
  INVALID_MFA_CHALLENGE_TOKEN,
  INVALID_REFRESH_TOKEN } from "utils-node/errors";
import { decode, verify } from "jsonwebtoken";
import {
  AUDIENCE,
  ISSUER,
  MFA_CHALLENGE_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET
} from "../../env-config";

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
