import { ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER } from '../../env-config';
import { Router, Response } from 'express';
import {
  checkTokenGrantType,
  transformJwtErrorMessages,
  validateAccessToken,
} from 'utils-ts/jwtMiddleware';
import logger from '../loggers/logger';
import { Request } from 'express-jwt';
import db from '../database';
import { errorMessages } from 'utils-ts/messageBuilder';
import { INTERNAL_ERROR, UNAUTHORIZED_ACCESS } from 'utils-ts/errors';
import { itemsClient } from '../s3';

const router = Router();

router.get(
  '/thumbnail/presigned-url/:itemId',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType('password'),
    transformJwtErrorMessages(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub!;
    const { itemId } = req.params;

    try {
      const { rowCount } = await db.query(
        `
          SELECT 1
          FROM public.project_members pm
          JOIN public.profiles p ON pm.member_id = p.user_id
          JOIN public.items i ON pm.project_id = i.project_id
          WHERE i.id = $1::integer AND pm.member_id = $2::uuid AND pm.role IN ('Admin', 'Editor', 'Owner')
        `,
        [itemId, userId],
      );

      if (rowCount === 0) {
        logger.error(
          `User is not authorized to updated the thumbnail of an item: ${userId}`,
        );
        return res
          .status(401)
          .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
      }
    } catch (e) {
      logger.error(
        `Error while checking the current user if authorized for updating item thumbnail. Error: Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
      const signedPost = await itemsClient.createPresignedPost({
        Bucket: 'items',
        Fields: {
          key: 'thumbnails/' + itemId + '.webp',
          'Content-Type': `image/webp`,
        },
        Conditions: [
          ['content-length-range', 0, 1024 * 1024],
          ['eq', '$Content-Type', `image/webp`],
        ],
        Expires: 60,
      });

      return res.json(signedPost);
    } catch (e) {
      logger.error(
        `Error while generating a signed url for item thumbnail upload for item: ${itemId}. Error: Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
  },
);

export default router;
