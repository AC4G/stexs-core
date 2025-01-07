import jwt from 'jsonwebtoken';
import {
	ACCESS_TOKEN_SECRET,
	REFRESH_TOKEN_SECRET,
	SIGN_IN_CONFIRM_TOKEN_SECRET,
	ISSUER,
	AUDIENCE,
	JWT_EXPIRY_LIMIT,
	JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT,
	JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT,
} from '../../env-config';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import logger from '../loggers/logger';

export function generateSignInConfirmToken(sub: string, types: string[]) {
	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT;

	const payload = {
		iss: ISSUER,
		aud: AUDIENCE,
		sub,
		types,
		grant_type: 'sign_in_confirm',
		iat,
		exp,
	};

	return {
		token: jwt.sign(payload, SIGN_IN_CONFIRM_TOKEN_SECRET),
		expires: exp,
	};
}

export default async function generateAccessToken(
	additionalPayload: Record<string, any>,
	grantType:
		| 'password'
		| 'client_credentials'
		| 'authorization_code' = 'password',
	connectionId: number | null = null,
	refreshToken: string | null = null,
	oldRefreshToken: string | null = null,
) {
	const iat = Math.floor(Date.now() / 1000);
	const EXP_LIMIT =
		grantType === 'authorization_code'
			? JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT
			: JWT_EXPIRY_LIMIT;
	const exp = iat + EXP_LIMIT;

	if (grantType === 'password') additionalPayload.session_id = uuidv4();

	const accessTokenPayload = {
		iss: ISSUER,
		aud: AUDIENCE,
		...additionalPayload,
		grant_type: grantType,
		role: 'authenticated',
		iat,
		exp,
	};

	logger.debug(`Access Token Payload: ${JSON.stringify(accessTokenPayload)}`);

	const accessToken = jwt.sign(accessTokenPayload, ACCESS_TOKEN_SECRET!);

	if (grantType === 'client_credentials') {
		return {
			access_token: accessToken,
			token_type: 'bearer',
			expires: exp,
		};
	}

	if (
		grantType === 'authorization_code' &&
		connectionId === null &&
		oldRefreshToken !== null
	) {
		throw Error(
			'connectionId is required to generate initial access token for authorization_code grant tokens',
		);
	}

	const jti = refreshToken ? refreshToken : uuidv4();

	try {
		if (oldRefreshToken && grantType === 'authorization_code') {
			await db.query(
				`
					UPDATE auth.refresh_tokens
					SET
						token = $1::uuid,
						updated_at = CURRENT_TIMESTAMP
					WHERE token = $2::uuid 
						AND user_id = $3::uuid 
						AND grant_type = 'authorization_code' 
						AND session_id IS NULL;
				`,
				[jti, oldRefreshToken, additionalPayload.sub],
			);
		} else {
			await db.query(
				`
					INSERT INTO auth.refresh_tokens (
						token, 
						user_id, 
						grant_type, 
						session_id,
						connection_id
					)
					VALUES (
						$1::uuid, 
						$2::uuid, 
						$3::text, 
						$4::uuid,
						$5::int
					);
				`,
				[
					jti,
					additionalPayload.sub,
					grantType,
					additionalPayload.session_id,
					connectionId,
				],
			);
		}
	} catch (e) {
		logger.error(
			`Error in generateAccessToken: ${e instanceof Error ? e.message : e}`,
		);
		throw e;
	}

	const refreshTokenPayload = {
		iss: ISSUER,
		aud: AUDIENCE,
		...additionalPayload,
		grant_type: grantType,
		iat,
		jti,
	};

	logger.debug(`Refresh Token Payload: ${JSON.stringify(refreshTokenPayload)}`);

	return {
		access_token: accessToken,
		refresh_token: jwt.sign(refreshTokenPayload, REFRESH_TOKEN_SECRET!),
		token_type: 'bearer',
		expires: exp,
	};
}

export function isRefreshTokenValid(token: string): boolean {
	try {
		jwt.verify(token, REFRESH_TOKEN_SECRET, {
			audience: AUDIENCE,
			issuer: ISSUER,
			algorithms: ['HS256'],
		});
	} catch (e) {
		return false;
	}

	return true;
}
