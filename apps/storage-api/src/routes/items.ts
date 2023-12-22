import { 
  ACCESS_TOKEN_SECRET, 
  AUDIENCE, 
  BUCKET, 
  ISSUER 
} from '../../env-config';
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
import { 
  INTERNAL_ERROR, 
  ITEM_ID_NOT_NUMERIC, 
  ITEM_ID_REQUIRED, 
  ITEM_NOT_FOUND, 
  UNAUTHORIZED_ACCESS 
} from 'utils-ts/errors';
import s3 from '../s3';
import { param } from 'express-validator';
import validate from 'utils-ts/validatorMiddleware';

const router = Router();

router.get(
  '/thumbnail/:itemId',
  [
    param('itemId')
      .notEmpty()
      .withMessage(ITEM_ID_REQUIRED)
      .bail()
      .isNumeric()
      .withMessage(ITEM_ID_NOT_NUMERIC),
    validate(logger)
  ],
  async (req: Request, res: Response) => {
    const { itemId } = req.params;

    const time = 60 * 60 * 24 * 7; // 7 days in seconds

    const signedUrl = await s3.getSignedUrl('getObject', {
      Bucket: BUCKET,
      Key: `items/thumbnails/${itemId}`,
      Expires: time
    });

    logger.info(`Generated new presigned url for item thumbnail: ${itemId}`);
  
    return res.json({
      url: signedUrl
    });
});

router.post(
  '/thumbnail/:itemId',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password']),
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
          WHERE i.id = $1::integer AND pm.member_id = $2::uuid AND pm.role IN ('Admin', 'Editor', 'Owner');
        `,
        [itemId, userId],
      );

      if (rowCount === 0) {
        logger.error(
          `User is not authorized to upload/update the thumbnail of an item: ${itemId}. User: ${userId}`,
        );
        return res
          .status(401)
          .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
      }
    } catch (e) {
      logger.error(
        `Error while checking the current user if authorized for uploading/updating item thumbnail. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const signedPost = await s3.createPresignedPost({
      Bucket: BUCKET,
      Fields: {
        key: 'items/thumbnails/' + itemId,
        'Content-Type': `image/webp`,
      },
      Conditions: [
        ['content-length-range', 0, 1024 * 1024],
        ['eq', '$Content-Type', `image/webp`],
      ],
      Expires: 60,
    });

    logger.info(`Created signed post url for item thumbnail: ${itemId}`);

    return res.json(signedPost);
  },
);

export default router;
