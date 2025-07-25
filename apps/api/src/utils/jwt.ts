import jwt from 'jsonwebtoken';
import {
	ACCESS_TOKEN_SECRET,
	REFRESH_TOKEN_SECRET,
	MFA_CHALLENGE_TOKEN_SECRET,
	ISSUER,
	AUDIENCE,
	JWT_EXPIRY_LIMIT,
	JWT_EXPIRY_MFA_CHALLENGE_LIMIT,
	JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT,
} from '../../env-config';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';
import {
	saveRefreshToken,
	updateAuthorizationCodeRefreshToken
} from '../repositories/auth/refreshTokens';
import { PoolClient } from 'pg';

export function generateMFAChallengeToken(sub: string, types: string[]) {
	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + JWT_EXPIRY_MFA_CHALLENGE_LIMIT;

	const payload = {
		iss: ISSUER,
		aud: AUDIENCE,
		sub,
		types,
		grant_type: 'mfa_challenge',
		iat,
		exp,
	};

	return {
		token: jwt.sign(payload, MFA_CHALLENGE_TOKEN_SECRET),
		expires: exp,
	};
}

export default async function generateAccessToken({
	additionalPayload,
	grantType = 'password',
	connectionId = null,
	refreshToken = null,
	oldRefreshToken = null,
	client = undefined,
}: {
	additionalPayload: Record<string, any>;
	grantType?: 'password' | 'client_credentials' | 'authorization_code';
	connectionId?: number | null;
	refreshToken?: string | null;
	oldRefreshToken?: string | null;
	client?: PoolClient;
}) {
	const iat = Math.floor(Date.now() / 1000);
	const EXP_LIMIT =
		grantType === 'authorization_code'
			? JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT
			: JWT_EXPIRY_LIMIT;
	const exp = iat + EXP_LIMIT;

	if (grantType === 'password' && !additionalPayload.session_id) additionalPayload.session_id = uuidv4();

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
			await updateAuthorizationCodeRefreshToken(
				jti,
				oldRefreshToken,
				additionalPayload.sub,
				connectionId!,
				client
			);
		} else {
			await saveRefreshToken(
				jti,
				additionalPayload.sub,
				grantType,
				additionalPayload.session_id,
				connectionId,
				client
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
		refresh_token: jwt.sign(refreshTokenPayload, REFRESH_TOKEN_SECRET),
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
