import { Router, Response } from 'express';
import logger from '../loggers/logger';
import { Request } from 'express-jwt';
import { param } from 'express-validator';
import validate from 'utils-node/validatorMiddleware';
import {
  INTERNAL_ERROR,
  ORGANIZATION_ID_NOT_NUMERIC,
  ORGANIZATION_ID_REQUIRED,
  UNAUTHORIZED_ACCESS,
} from 'utils-node/errors';
import {
  checkTokenGrantType,
  transformJwtErrorMessages,
  validateAccessToken,
} from 'utils-node/jwtMiddleware';
import {
  ACCESS_TOKEN_SECRET,
  AUDIENCE,
  BUCKET,
  ISSUER,
} from '../../env-config';
import db from '../database';
import { errorMessages } from 'utils-node/messageBuilder';
import s3 from '../s3';
import { checkScopes } from '../middlewares/scopes';

const router = Router();

router.get(
  '/:organizationId',
  [
    param('organizationId')
      .notEmpty()
      .withMessage(ORGANIZATION_ID_REQUIRED)
      .bail()
      .isNumeric()
      .withMessage(ORGANIZATION_ID_NOT_NUMERIC),
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const { organizationId } = req.params;

    const time = 60 * 60 * 24; // 1 day

    const signedUrl = await s3.getSignedUrl('getObject', {
      Bucket: BUCKET,
      Key: `organizations/${organizationId}`,
      Expires: time,
    });

    logger.info(
      `Generated new presigned url for organization logo: ${organizationId}`,
    );

    return res.json({
      url: signedUrl,
    });
  },
);

router.post(
  '/:organizationId',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password', 'client_credentials']),
    checkScopes(['organization.logo.write']),
    transformJwtErrorMessages(logger),
    param('organizationId')
      .notEmpty()
      .withMessage(ORGANIZATION_ID_REQUIRED)
      .bail()
      .isNumeric()
      .withMessage(ORGANIZATION_ID_NOT_NUMERIC),
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const sub = req.auth?.sub;
    const { organizationId } = req.params;
    const grantType = req.auth?.grant_type;
    const clientId = req.auth?.client_id;
    const organizationIdFromToken = req.auth?.organization_id;

    try {
      let isAllowed = false;

      if (grantType === 'password') {
        const { rowCount } = await db.query(
          `
            SELECT 1
            FROM public.organization_members
            WHERE member_id = $1::uuid 
              AND organization_id = $2::integer 
              AND role IN ('Admin', 'Owner');
          `,
          [sub, organizationId],
        );

        if (rowCount) isAllowed = true;
      } else {
        if (organizationId === organizationIdFromToken) isAllowed = true;
      }

      if (!isAllowed) {
        const consumer = grantType === 'password' ? 'User' : 'Client';
        const consumerId = grantType === 'password' ? sub : clientId;

        logger.warn(
          `${consumer} is not authorized to upload/update the logo of the given organization: ${organizationId}. ${consumer}: ${consumerId}`,
        );
        return res
          .status(401)
          .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
      }
    } catch (e) {
      logger.error(
        `Error while checking the current user if authorized for uploading/updating organization logo. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const signedPost = await s3.createPresignedPost({
      Bucket: BUCKET,
      Fields: {
        key: 'organizations/' + organizationId,
        'Content-Type': `image/webp`,
      },
      Conditions: [
        ['content-length-range', 0, 1024 * 1024],
        ['eq', '$Content-Type', `image/webp`],
      ],
      Expires: 60 * 5, // 5 minutes
    });

    logger.info(
      `Created signed post url for organization logo: ${organizationId}`,
    );

    return res.json(signedPost);
  },
);

router.delete(
  '/:organizationId',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password', 'client_credentials']),
    checkScopes(['organization.logo.delete']),
    transformJwtErrorMessages(logger),
    param('organizationId')
      .notEmpty()
      .withMessage(ORGANIZATION_ID_REQUIRED)
      .bail()
      .isNumeric()
      .withMessage(ORGANIZATION_ID_NOT_NUMERIC),
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const sub = req.auth?.sub;
    const organizationId = parseInt(req.params.organizationId);
    const grantType = req.auth?.grant_type;
    const clientId = req.auth?.client_id;
    const organizationIdFromToken = req.auth?.organization_id;

    try {
      let isAllowed = false;

      if (grantType === 'password') {
        const { rowCount } = await db.query(
          `
            SELECT 1
            FROM public.organization_members
            WHERE member_id = $1::uuid 
              AND organization_id = $2::integer 
              AND role IN ('Admin', 'Owner');
          `,
          [sub, organizationId],
        );

        if (rowCount) isAllowed = true;
      } else {
        if (organizationId === organizationIdFromToken) isAllowed = true;
      }

      if (!isAllowed) {
        const consumer = grantType === 'password' ? 'User' : 'Client';
        const consumerId = grantType === 'password' ? sub : clientId;

        logger.warn(
          `${consumer} is not authorized to delete the logo of the given organization: ${organizationId}. ${consumer}: ${consumerId}`,
        );
        return res
          .status(401)
          .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
      }
    } catch (e) {
      logger.error(
        `Error while checking the current user if authorized for deleting organization logo. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
      await s3
        .deleteObjects({
          Bucket: BUCKET,
          Delete: {
            Objects: [{ Key: 'organizations/' + organizationId }],
          },
        })
        .promise();

      logger.info(`Deleted logo from organization: ${organizationId}`);
    } catch (e) {
      logger.error(
        `Error while deleting organization logo. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    return res.status(204).json();
  },
);

export default router;
