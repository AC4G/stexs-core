import { Router, Response } from 'express';
import { param, query } from 'express-validator';
import {
  FILE_EXTENSION_REQUIRED,
  INTERNAL_ERROR,
  INVALID_USERNAME,
  UNSUPPORTED_FILE_EXTENSION,
  USERNAME_REQUIRED,
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
import { Request } from 'express-jwt';
import redis from '../redis';

const router = Router();

router.get(
  '/:username', 
  [
    param('username')
      .notEmpty()
      .withMessage(USERNAME_REQUIRED)
      .bail()
      .isLength({ min: 1, max: 20 })
      .withMessage({
        code: INVALID_USERNAME.code,
        message: INVALID_USERNAME.messages[0],
      })
      .custom((value: string) => {
        if (!/^[A-Za-z0-9._]+$/.test(value))
          throw new CustomValidationError({
            code: INVALID_USERNAME.code,
            message: INVALID_USERNAME.messages[2],
          });

        return true;
      })
      .custom((value: string) => {
        if (/^\w+([-]?\w+)*@\w+([-]?\w+)*(\.\w{2,3})+$/.test(value))
          throw new CustomValidationError({
            code: INVALID_USERNAME.code,
            message: INVALID_USERNAME.messages[1],
          });

        return true;
      }),
    validate(logger)
  ],async (req: Request, res: Response) => {
  const username = req.params.username.toLowerCase();

  const url = await redis.get(`avatars:${username}`);

  if (url) {
    return res.json({ url });
  }

  const time = 60 * 60 * 24 * 7; // 7 days in seconds

  const signedUrl = await s3.getSignedUrl('getObject', {
    Bucket: BUCKET,
    Key: `avatars/${username}`,
    Expires: time
  });

  try {
    await redis.set(`avatars:${username}`, signedUrl, {
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

router.get(
  '/presigned-url',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType('password'),
    transformJwtErrorMessages(logger),
    query('fileExtension')
      .notEmpty()
      .withMessage(FILE_EXTENSION_REQUIRED)
      .custom((value: string) => {
        const supportedFileExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (!supportedFileExtensions.includes(value))
          throw new CustomValidationError(UNSUPPORTED_FILE_EXTENSION);

        return true;
      }),
    validate(logger),
  ],
  async (req: Request, res: Response) => {
    const userId = req.auth?.sub!;
    const { fileExtension } = req.query;

    try {
      const { KeyCount, Contents } = await s3
        .listObjectsV2({
          Bucket: BUCKET,
          MaxKeys: 1,
          Prefix: 'avatars/' + userId,
        })
        .promise();

      if (
        KeyCount &&
        KeyCount > 0 &&
        Contents &&
        Contents[0].Key !== userId + '.' + fileExtension
      ) {
        await s3
          .deleteObjects({
            Bucket: BUCKET,
            Delete: {
              Objects: [{ Key: Contents[0].Key as string }],
            },
          })
          .promise();

        logger.info(`Deleted avatar from user: ${userId}`);
      }
    } catch (e) {
      logger.error(
        `Error while fetching list of objects or delete object in avatars bucket. Error: Error: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    try {
      const signedPost = await s3.createPresignedPost({
        Bucket: BUCKET,
        Fields: {
          key: 'avatars/' + userId + '.' + fileExtension,
          'Content-Type': `image/${fileExtension}`,
        },
        Conditions: [
          ['content-length-range', 0, 1024 * 1024],
          ['eq', '$Content-Type', `image/${fileExtension}`],
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
      const { KeyCount, Contents } = await s3
        .listObjectsV2({
          Bucket: BUCKET,
          MaxKeys: 1,
          Prefix: 'avatars/' + userId,
        })
        .promise();

      if (KeyCount && KeyCount > 0 && Contents) {
        await s3
          .deleteObjects({
            Bucket: 'stexs',
            Delete: {
              Objects: [{ Key: Contents[0].Key as string }],
            },
          })
          .promise();

        logger.info(`Deleted avatar from user: ${userId}`);
      }
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
