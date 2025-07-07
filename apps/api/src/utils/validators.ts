import { CustomValidationError } from "utils-node/messageBuilder";
import { grantTypesInRefreshToken, possibleGrantTypes } from "../types/auth";
import { INVALID_GRANT_TYPE,
  INVALID_REFRESH_TOKEN } from "utils-node/errors";
import { decode, verify } from "jsonwebtoken";
import {
  AUDIENCE,
  ISSUER,
  REFRESH_TOKEN_SECRET
} from "../../env-config";

export const isGrantType = (value: any): boolean =>
  possibleGrantTypes.includes(value);

export const decodeRefreshToken = async (token: string, req: any) => {
  const decoded = decode(token, { json: true }) as { grant_type?: string };

  if (!decoded?.grant_type || !['authorization_code', 'password'].includes(decoded.grant_type)) {
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
