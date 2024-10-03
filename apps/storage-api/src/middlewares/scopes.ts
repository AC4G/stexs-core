import { NextFunction, Response } from 'express';
import { Request } from 'express-jwt';
import { INSUFFICIENT_SCOPES, INTERNAL_ERROR } from 'utils-node/errors';
import MiddlewareError from 'utils-node/jwtMiddleware';
import db from '../database';
import logger from '../loggers/logger';

export function checkScopes(
	requiredScopes: string[],
): (req: Request, res: Response, next: NextFunction) => void {
	return (req: Request, res: Response, next: NextFunction) => {
		const grantType = req.auth?.grant_type;

		if (grantType === 'password') return next();

		const clientId = req.auth?.client_id;

		db
			.query(
				`
					SELECT 1
					FROM public.oauth2_app_scopes AS oas
					JOIN public.oauth2_apps AS a ON oas.app_id = a.id
					JOIN public.scopes AS s ON oas.scope_id = s.id
					WHERE a.client_id = $1::uuid
						AND s.name = ANY($2::varchar[]);
      			`,
				[clientId, requiredScopes],
			)
			.then((result) => {
				const { rowCount } = result;

				if (rowCount !== 0) return next();

				throw new MiddlewareError(INSUFFICIENT_SCOPES, 401, {
					scopes: requiredScopes,
				});
			})
			.catch((e) => {
				logger.error(
					`Error while checking client for scopes. Error: ${
						e instanceof Error ? e.message : e
					}`,
				);
				throw new MiddlewareError(INTERNAL_ERROR, 500);
			});
	};
}
