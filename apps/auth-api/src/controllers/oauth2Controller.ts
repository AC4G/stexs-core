import { Response } from 'express';
import { errorMessages } from 'utils-node/messageBuilder';
import {
  CODE_EXPIRED,
  INTERNAL_ERROR,
  INVALID_AUTHORIZATION_CODE,
  INVALID_CLIENT_CREDENTIALS,
  INVALID_REFRESH_TOKEN,
  NO_CLIENT_SCOPES_SELECTED,
} from 'utils-node/errors';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import generateAccessToken from '../services/jwtService';
import { Request } from 'express-jwt';
import logger from '../loggers/logger';
import { isExpired } from 'utils-node';

export async function authorizationCodeController(req: Request, res: Response) {
  const { code, client_id, client_secret: clientSecret } = req.body;

  let userId, tokenId, scopes, organization_id;

  try {
    const { rowCount, rows } = await db.query(
      `
        WITH app_info AS (
            SELECT id, organization_id
            FROM public.oauth2_apps
            WHERE client_id = $2::uuid
            AND client_secret = $3::text
        ),
        token_info AS (
            SELECT aot.id, aot.user_id, aot.created_at, ai.organization_id
            FROM auth.oauth2_authorization_tokens AS aot
            JOIN app_info AS ai ON aot.app_id = ai.id
            WHERE aot.token = $1::uuid
        ),
        token_scopes AS (
            SELECT STRING_TO_ARRAY(STRING_AGG(s.name, ','), ',') AS scopes
            FROM auth.oauth2_authorization_token_scopes AS aot
            JOIN public.scopes AS s ON aot.scope_id = s.id
            WHERE aot.token_id IN (SELECT id FROM token_info)
        )
        SELECT id, user_id, scopes, created_at, organization_id
        FROM token_info
        CROSS JOIN token_scopes;
      `,
      [code, client_id, clientSecret],
    );

    if (rowCount === 0) {
      logger.warn(
        `Invalid authorization code for client: ${client_id} and code: ${code}`,
      );
      return res.status(400).json(
        errorMessages([
          {
            info: INVALID_AUTHORIZATION_CODE,
            data: {
              location: 'body',
              path: 'code',
            },
          },
        ]),
      );
    }

    if (isExpired(rows[0].created_at, 5)) {
      logger.warn(
        `Authorization code expired for client: ${client_id} and code: ${code}`,
      );
      return res.status(400).json(
        errorMessages([
          {
            info: CODE_EXPIRED,
            data: {
              location: 'body',
              path: 'code',
            },
          },
        ]),
      );
    }

    ({ id: tokenId, user_id: userId, scopes, organization_id } = rows[0]);

    logger.info(
      `Authorization code validated successfully for user: ${userId} and client: ${client_id}`,
    );
  } catch (e) {
    logger.error(
      `Error while processing authorization code for client: ${client_id} and code: ${code}. Error: ${
        e instanceof Error ? e.message : e
      }`,
    );
    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }

  try {
    const { rowCount } = await db.query(
      `
        DELETE FROM auth.oauth2_authorization_tokens
        WHERE id = $1::integer;
      `,
      [tokenId],
    );

    if (rowCount === 0) {
      logger.error(
        `Failed to delete authorization code for user: ${userId} and client: ${client_id}`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
  } catch (e) {
    logger.error(
      `Error while deleting authorization code for user: ${userId} and client: ${client_id}. Error: ${
        e instanceof Error ? e.message : e
      }`,
    );
    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }

  const refreshToken = uuidv4();
  let body;

  try {
    body = await generateAccessToken(
      {
        sub: userId,
        scopes,
        client_id,
        organization_id,
      },
      'authorization_code',
      refreshToken,
    );

    logger.info(
      `Access token generated successfully for user: ${userId} and client: ${client_id}`,
    );
  } catch (e) {
    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }

  try {
    const { rowCount } = await db.query(
      `
        WITH app_info AS (
            SELECT id
            FROM public.oauth2_apps
            WHERE client_id = $2::uuid
        ),
        refresh_token_info AS (
            SELECT id
            FROM auth.refresh_tokens
            WHERE user_id = $3::uuid AND token = $1::uuid AND grant_type = 'authorization_code' AND session_id IS NULL
        )
        INSERT INTO auth.oauth2_connections (user_id, app_id, refresh_token_id)
        SELECT $3::uuid, id, (SELECT id FROM refresh_token_info)
        FROM app_info;
      `,
      [refreshToken, client_id, userId],
    );

    if (rowCount === 0) {
      logger.error(
        `Failed to insert connection for user: ${userId} and client: ${client_id}`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
  } catch (e) {
    logger.error(
      `Error while inserting connection for user: ${userId} and client: ${client_id}. Error: ${
        e instanceof Error ? e.message : e
      }`,
    );
    res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }

  logger.info(
    `Connection successfully created for user: ${userId} and client: ${client_id}`,
  );

  res.json(body);
}

export async function clientCredentialsController(req: Request, res: Response) {
  const { client_id, client_secret } = req.body;

  let scopes;
  let organization_id;

  try {
    const { rowCount, rows } = await db.query(
      `
        WITH app_info AS (
            SELECT id, organization_id
            FROM public.oauth2_apps
            WHERE client_id = $1::uuid
            AND client_secret = $2::text
        ),
        app_scopes AS (
            SELECT STRING_TO_ARRAY(STRING_AGG(s.name, ','), ',') AS scopes
            FROM app_info AS ai
            JOIN public.oauth2_app_scopes AS oas ON ai.id = oas.app_id
            JOIN public.scopes AS s ON oas.scope_id = s.id
            WHERE s.type = 'client'
        )
        SELECT scopes, organization_id
        FROM app_info
        CROSS JOIN app_scopes;
      `,
      [client_id, client_secret],
    );

    if (rowCount === 0) {
      logger.warn(`Invalid client credentials for client: ${client_id}`);
      return res.status(400).json(
        errorMessages([
          {
            info: INVALID_CLIENT_CREDENTIALS,
            data: {
              location: 'body',
              paths: ['client_id', 'client_secret'],
            },
          },
        ]),
      );
    }

    scopes = rows[0].scopes;
    organization_id = rows[0].organization_id;

    if (!scopes || scopes.length === 0) {
      logger.warn(`No client scopes selected for client: ${client_id}`);
      return res
        .status(400)
        .json(errorMessages([{ info: NO_CLIENT_SCOPES_SELECTED }]));
    }

    logger.info(
      `Client credentials validated successfully for client: ${client_id}`,
    );
  } catch (e) {
    logger.error(
      `Error while processing client credentials for client: ${client_id}. Error: ${
        e instanceof Error ? e.message : e
      }`,
    );
    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }

  try {
    const body = await generateAccessToken(
      {
        scopes,
        client_id,
        organization_id,
      },
      'client_credentials',
    );

    logger.info(`Access token generated successfully for client: ${client_id}`);

    res.json(body);
  } catch (e) {
    res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }
}

export async function refreshTokenController(req: Request, res: Response) {
  const { scopes, sub, client_id, organization_id, jti } = req.auth!;

  try {
    const { rowCount } = await db.query(
      `
        SELECT 1
        FROM auth.refresh_tokens
        WHERE token = $1::uuid AND user_id = $2::uuid AND grant_type = 'authorization_code' AND session_id IS NULL;
      `,
      [jti, sub],
    );

    if (rowCount === 0) {
      logger.warn(
        `Invalid refresh token for user: ${sub} and client: ${client_id}`,
      );
      return res.status(400).json(
        errorMessages([
          {
            info: INVALID_REFRESH_TOKEN,
            data: {
              location: 'body',
              path: 'refresh_token',
            },
          },
        ]),
      );
    }

    logger.info(
      `Refresh token validated successfully for user: ${sub} and client: ${client_id}`,
    );
  } catch (e) {
    logger.error(
      `Error while processing refresh token for user: ${sub} and client: ${client_id}. Error: ${
        e instanceof Error ? e.message : e
      }`,
    );
    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }

  try {
    const body = await generateAccessToken(
      {
        sub,
        scopes,
        client_id,
        organization_id,
      },
      'authorization_code',
      null,
      jti,
    );

    logger.info(
      `Access token retrieved successfully for user: ${sub} and client: ${client_id}`,
    );

    res.json(body);
  } catch (e) {
    res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }
}
