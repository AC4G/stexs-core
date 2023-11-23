import { Router, Response } from 'express';
import { body } from 'express-validator';
import {
  FILE_EXTENSION_REQUIRED,
  INTERNAL_ERROR,
  UNSUPPORTED_FILE_EXTENSION,
} from 'utils-ts/errors';
import { CustomValidationError, errorMessages } from 'utils-ts/messageBuilder';
import validate from 'utils-ts/validatorMiddleware';
import { avatarsClient } from '../s3';
import logger from '../loggers/logger';
import {
  validateAccessToken,
  checkTokenGrantType,
  transformJwtErrorMessages,
} from 'utils-ts/jwtMiddleware';
import { ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER } from '../../env-config';
import { Request } from 'express-jwt';

const router = Router();

router.post(
  '',
  [
    validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
    checkTokenGrantType('password'),
    transformJwtErrorMessages(logger),
    body('fileExtension')
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
    const { fileExtension } = req.body;

    try {
      const { KeyCount, Contents } = await avatarsClient
        .listObjectsV2({
          Bucket: 'avatars',
          MaxKeys: 1,
          Prefix: userId,
        })
        .promise();

      if (
        KeyCount &&
        KeyCount > 0 &&
        Contents &&
        Contents[0].Key !== userId + '.' + fileExtension
      ) {
        await avatarsClient
          .deleteObjects({
            Bucket: 'avatars',
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

    if (res.headersSent) return res;

    try {
      const signedUrl = await avatarsClient.getSignedUrl('putObject', {
        Bucket: 'avatars',
        Key: userId + '.' + fileExtension,
        Expires: 10,
        ContentType: `image/${fileExtension}`,
      });

      return res.json({ signedUrl });
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
      const { KeyCount, Contents } = await avatarsClient
        .listObjectsV2({
          Bucket: 'avatars',
          MaxKeys: 1,
          Prefix: userId,
        })
        .promise();

      if (KeyCount && KeyCount > 0 && Contents) {
        await avatarsClient
          .deleteObjects({
            Bucket: 'avatars',
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
