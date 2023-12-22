import { Router, Response } from 'express';
import { param } from 'express-validator';
import {
  INTERNAL_ERROR,
  INVALID_UUID,
  USER_ID_REQUIRED,
  USER_NOT_FOUND,
} from 'utils-ts/errors';
import { CustomValidationError, errorMessages } from 'utils-ts/messageBuilder';
import validate from 'utils-ts/validatorMiddleware';
import s3 from '../s3';
import logger from '../loggers/logger';
import {
  validateAccessToken,
  checkTokenGrantType,
  transformJwtErrorMessages,
} from 'utils-ts/jwtMiddleware';
import { 
  ACCESS_TOKEN_SECRET, 
  AUDIENCE, 
  ISSUER, 
  BUCKET 
} from '../../env-config';
import { validate as validateUUID } from 'uuid';
import { Request } from 'express-jwt';
import redis from '../redis';
import db from '../database';

const router = Router();

router.get(
  '/:userId', 
  [
    param('userId')
      .notEmpty()
      .withMessage(USER_ID_REQUIRED)
      .bail()
      .custom((value) => {
        if (!validateUUID(value)) throw new CustomValidationError(INVALID_UUID);

        return true;
      }),
    validate(logger)
  ],async (req: Request, res: Response) => {
  const { userId } = req.params;

  const url = await redis.get(`avatars:${userId}`);

  if (url) {
    logger.info(`Avatar presigned url fetched from cache: ${userId}`);
    return res.json({ url });
  }

  try {
    const { rowCount } = await db.query(
      `
        SELECT 1
        FROM auth.users
        WHERE id = $1::uuid;
      `,
      [userId]
    );

    if (rowCount === 0) {
      logger.warn(`User not found for user id: ${userId}`);
      return res.status(404).json(
        errorMessages([
          {
            info: USER_NOT_FOUND,
            data: {
              location: 'params',
              path: 'userId',
            },
          },
        ]),
      );
    }
  } catch (e) {
    logger.error(
      `Error while checking user for existence: ${userId}. Error: ${
        e instanceof Error ? e.message : e
      }`,
    );
    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
  }

  const expires = 60 * 60 * 24 * 7; // 7 days in seconds

  const signedUrl = await s3.getSignedUrl('getObject', {
    Bucket: BUCKET,
    Key: `avatars/${userId}`,
    Expires: expires
  });

  logger.info(`Generated new presigned url for avatar: ${userId}`);

  try {
    await redis.set(`avatars:${userId}`, signedUrl, {
      EX: expires - 10
    });
  } catch (e) {
    logger.error(
      `Error while setting signed url for avatar into cache. Error: ${
        e instanceof Error ? e.message : e
      }`,
    );
  }

  return res.json({
    url: signedUrl
  });
});

router.post(
  '',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password']),
    transformJwtErrorMessages(logger)
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub!;

    const signedPost = await s3.createPresignedPost({
      Bucket: BUCKET,
      Fields: {
        key: 'avatars/' + userId,
        'Content-Type': `image/webp`,
      },
      Conditions: [
        ['content-length-range', 0, 1024 * 1024],
        ['eq', '$Content-Type', `image/webp`],
      ],
      Expires: 60,
    });

    logger.info(`Created signed post url for avatar: ${userId}`);

    return res.json(signedPost);
  },
);

router.delete(
  '',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType(['password']),
    transformJwtErrorMessages(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub!;

    try {
      await s3
        .deleteObjects({
          Bucket: BUCKET,
          Delete: {
            Objects: [{ Key: 'avatars/' + userId }],
          },
        })
        .promise();

      logger.info(`Deleted avatar from user: ${userId}`);
    } catch (e) {
      logger.error(
        `Error while deleting avatar. Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    return res.status(204).json();
  },
);

export default router;
