import { Router, Response } from 'express';
import { param } from 'express-validator';
import {
  INTERNAL_ERROR,
  INVALID_UUID,
  USER_ID_REQUIRED,
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
import { ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER, BUCKET } from '../../env-config';
import { validate as validateUUID } from 'uuid';
import { Request } from 'express-jwt';
import redis from '../redis';

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
    return res.json({ url });
  }

  const time = 60 * 60 * 24 * 7; // 7 days in seconds

  const signedUrl = await s3.getSignedUrl('getObject', {
    Bucket: BUCKET,
    Key: `avatars/${userId}`,
    Expires: time
  });

  try {
    await redis.set(`avatars:${userId}`, signedUrl, {
      EX: time
    });
  } catch (e) {
    logger.error(
      `Error while setting signed url for avatar into cache. Error: Error: ${
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
    checkTokenGrantType('password'),
    transformJwtErrorMessages(logger)
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub!;

    try {
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

      return res.json(signedPost);
    } catch (e) {
      logger.error(
        `Error while generating a signed url for avatar upload for user: ${userId}. Error: Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }
  },
);

router.delete(
  '',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType('password'),
    transformJwtErrorMessages(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub!;

    try {
      await s3
        .deleteObjects({
          Bucket: 'stexs',
          Delete: {
            Objects: [{ Key: 'avatars/' + userId }],
          },
        })
        .promise();

      logger.info(`Deleted avatar from user: ${userId}`);
    } catch (e) {
      logger.error(
        `Error while fetching list of objects or delete object in avatars bucket. Error: Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    return res.status(204).json();
  },
);

export default router;
