import { NextFunction, Response } from 'express';
import { Request } from 'express-jwt';
import { INSUFFICIENT_SCOPES, INTERNAL_ERROR } from 'utils-node/errors';
import MiddlewareError from './jwtMiddleware';
import logger from '../logger';
import { extractError } from 'utils-node/logger';
import { grantTypesWithScopes } from '../types/auth';
import { checkClientScopes } from '../repositories/public/oauth2AppScopes';
import { checkConnectionScopes } from '../repositories/public/oauth2ConnectionScopes';

export function checkScopes(requiredScopes: string[]): (req: Request, res: Response, next: NextFunction) => void {
	return (req: Request, _res: Response, next: NextFunction) => {
		const grantType = req.auth?.grant_type;

		if (!grantTypesWithScopes.includes(grantType)) return next();

		const clientId = req.auth?.client_id;
		const sub = req.auth?.sub!;

		const queryFn = (
			clientId: string,
			requiredScopes: string[],
			sub: string
		) => {
			return grantType === 'client_credentials'
				? checkClientScopes(clientId, requiredScopes)
				: checkConnectionScopes(clientId, requiredScopes, sub);
		};

		queryFn(clientId, requiredScopes, sub)
			.then((result) => {
				const { rowCount } = result;

				if (rowCount !== 0) return next();

				throw new MiddlewareError(INSUFFICIENT_SCOPES, 401, {
					scopes: requiredScopes,
				});
			})
			.catch((err) => {
				logger.error('Error while checking client for scopes', { error: extractError(err) });
				throw new MiddlewareError(INTERNAL_ERROR, 500);
			});
	};
}
