import { CustomValidationError } from "utils-node/messageBuilder";
import { possibleGrantTypes } from "../types/auth";
import {
	version as uuidVersion,
	validate as validateUUID
} from 'uuid';
import { INVALID_GRANT_TYPE, INVALID_TOKEN, INVALID_UUID } from "utils-node/errors";
import { decode, verify } from "jsonwebtoken";
import { AUDIENCE, ISSUER, REFRESH_TOKEN_SECRET } from "../../env-config";

export const isGrantType = (value: any): boolean =>
  possibleGrantTypes.includes(value);

export const requireUUIDv4 = (value: string) => {
  if (!validateUUID(value) || uuidVersion(value) !== 4)
    throw new CustomValidationError(INVALID_UUID);
};

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
      if (err) return reject(new CustomValidationError(INVALID_TOKEN));

      if (verified && typeof verified === 'object') {
        if (verified.grant_type !== 'authorization_code') {
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
