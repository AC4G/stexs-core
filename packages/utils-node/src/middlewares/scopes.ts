import { NextFunction, Response } from 'express';
import { Request } from 'express-jwt';
import { INSUFFICIENT_SCOPES, INTERNAL_ERROR } from '../constants/errors';
import MiddlewareError from './jwt';
import { QueryConfig } from 'pg';
import { DbPool } from '../db';
import { Logger } from 'winston';
import { extractError } from '../loggers/utils';

export function checkScopes(
	requiredScopes: string[],
	db: DbPool,
	logger: Logger
): (req: Request, res: Response, next: NextFunction) => void {
	return (req: Request, res: Response, next: NextFunction) => {
		const grantType = req.auth?.grant_type;

		if (![
			'authorization_code', 
			'client_credentials'
		].includes(grantType)) return next();

		const clientId = req.auth?.client_id;
		const sub = req.auth?.sub;

		const query: QueryConfig = grantType === 'client_credentials' ? 
		{
			text: `
				SELECT 1
				FROM public.oauth2_app_scopes AS oas
				JOIN public.oauth2_apps AS a ON oas.app_id = a.id
				JOIN public.scopes AS s ON oas.scope_id = s.id
				WHERE a.client_id = $1::uuid
					AND s.name = ANY($2::varchar[])
					AND s.type = 'client'
				GROUP BY a.client_id
				HAVING COUNT(s.name) = array_length($2::varchar[], 1);
			`,
			name: 'check-scopes-client-credentials'
		} : {
			text: `
				SELECT 1
				FROM public.oauth2_connection_scopes AS ocs
				JOIN public.oauth2_connections AS oc 
					ON ocs.connection_id = oc.id
				JOIN public.scopes AS s ON ocs.scope_id = s.id
				WHERE s.name = ANY($2::varchar[])
					AND oc.client_id = $1::uuid
					AND oc.user_id = $3::uuid
					AND s.type = 'user'
				GROUP BY oc.client_id, oc.user_id
				HAVING COUNT(s.name) = array_length($2::varchar[], 1);
			`,
			name: 'check-scopes-authorization-code'
		};

		db.query(query,
			[clientId, requiredScopes, sub],
		)
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
